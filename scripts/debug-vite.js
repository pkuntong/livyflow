#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Debugging Vite module resolution...');

// Check if vite is installed
const vitePath = path.join(process.cwd(), 'node_modules', 'vite');
if (!fs.existsSync(vitePath)) {
  console.error('❌ Vite not found in node_modules');
  process.exit(1);
}

// Check vite CLI
const viteCliPath = path.join(vitePath, 'dist', 'node', 'cli.js');
if (!fs.existsSync(viteCliPath)) {
  console.error('❌ Vite CLI not found at:', viteCliPath);
  console.log('📦 Attempting to reinstall Vite...');
  
  try {
    execSync('npm install vite@latest', { stdio: 'inherit' });
    console.log('✅ Vite reinstalled successfully');
  } catch (error) {
    console.error('❌ Failed to reinstall Vite:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Vite CLI found at:', viteCliPath);
}

// Check package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log('📦 Vite version in package.json:', packageJson.devDependencies?.vite || 'not found');
}

// Check Node.js version
console.log('🟢 Node.js version:', process.version);

console.log('✅ Debug complete');
