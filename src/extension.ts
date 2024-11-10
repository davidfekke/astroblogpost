// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import path from 'path';
import { toKebabCase } from '@std/text';
import { DallEAPIWrapper } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

let statusBarItem: vscode.StatusBarItem;
let blogfolder = 'src/content/blog';

const imagePrompt = PromptTemplate.fromTemplate(`
  To generate a creative header image using Dall-E based on your blog post's headline and body text, we can design a flexible prompt that incorporates key elements of your blog. Here's how you can structure your prompt, making it adaptable to any blog post by substituting your specific headlines and text:
  
  ### Dall-E Prompt Template
  
  **Title of the Blog Post**: {headline}
  
  **Preferred Color Scheme and Art Style**: Bright and vibrant colors to emphasize growth and sustainability; a blend of digital art and watercolor styles for a modern yet organic feel
  
  **Mood or Atmosphere of the Image**: Inspiring and uplifting, showcasing harmony between urban life and nature
  
  Make sure to not include the Title of the Blog Post in the image. The image should be a visual representation of the blog post's content and theme.
`);

function createDate(): string {
  return new Date().toISOString().split('T')[0];
}

function createFrontMatter(title: string, image: string): string {
  return `---
title: "${title}"
tags: ["Node.js"]
description: "${title}"
category:
date: ${createDate()}
cover_image: "./${image}"
---

`;
}

function createMarkdownFile(mdp: string, frontmatter: string): void {
	if (!fs.existsSync(mdp)) {
		fs.writeFileSync(mdp, frontmatter);
	} else {
		vscode.window.showErrorMessage(`This file ${mdp} already exists.`);
	}
}

async function createImageFile(folderPath: string, coverImage: string, imageUrl: string) {
	const arrayBuf = await fetch(imageUrl).then(res => res.arrayBuffer());
	const imagePath = path.join(folderPath, coverImage);
	await fs.promises.writeFile(imagePath, Buffer.from(arrayBuf));
}

async function createMarkdownFolder(input: string) {
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBarItem.text = "Generating Blog Post...";
	statusBarItem.show();
	let folderPaths = vscode.workspace.workspaceFolders;
	if (!folderPaths) {
		vscode.window.showErrorMessage('No workspace folder is open.');
		return;
	}
	const allWorkspaceolders = folderPaths.map(folder => {
		return folder.uri.path;
	});

	if (allWorkspaceolders.length > 0) {
		const myConfig = vscode.workspace.getConfiguration('astroblogpost');
		const subfolder = myConfig.blogSourcePath || blogfolder;
		const openAIAPIKey = myConfig.openAIAPIKey || process.env.OPENAI_API_KEY;
		const currDate = createDate();
		const title = input || 'Your Title Here';
		const folderPath = path.join(allWorkspaceolders[0], subfolder, currDate);
		console.log(folderPath);
		let markdownFilename = 'index.md';
		let coverImage = 'unnamed.png';
	
		const tool = new DallEAPIWrapper({
      n: 1, // Default
      modelName: "dall-e-3", // Default
      openAIApiKey: openAIAPIKey, 
      size: "1792x1024"
  	});

		const prompt = await imagePrompt.format({ headline: title });
		const imageURL = await tool.invoke(prompt);

		if (!fs.existsSync(folderPath)) {
			fs.mkdirSync(folderPath);
		}
		
		if (title !== 'Your Title Here') {
			markdownFilename = toKebabCase(title) + '.md';
		}
		coverImage = `${toKebabCase(title)}.png`;

		const frontmatter = createFrontMatter(title, coverImage);
		const markdownPath = path.join(folderPath, markdownFilename);
		createMarkdownFile(markdownPath, frontmatter);
		createImageFile(folderPath, coverImage, imageURL);
		statusBarItem.hide();
		vscode.window.showInformationMessage(`Created a COOL post astroblogpost at ${markdownFilename} in ${subfolder}`);
	} else {
		vscode.window.showErrorMessage('Must have a workspace folder selected');	
	}
}

function startInputProcess() {
	vscode.window.showInputBox({
		value: '',
		placeHolder: 'Enter Your Title Here'
	}).then((result: string | undefined) => { 
		try {
			createMarkdownFolder(result || 'Your Title Here');
		} catch (err) {
			console.log(err);
		}
	});
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "astroblogpost" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('astroblogpost.createMarkdownPost', () => {
		startInputProcess();
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
