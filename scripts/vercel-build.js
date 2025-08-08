#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting Vercel build process...');

try {
  // Check Node.js version
  console.log('📦 Node.js version:', process.version);
  
  // Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  if (fs.existsSync('node_modules/.vite')) {
    fs.rmSync('node_modules/.vite', { recursive: true, force: true });
  }
  
  // Install dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm ci', { stdio: 'inherit' });
  
  // Verify Vite installation
  console.log('🔍 Verifying Vite installation...');
  const vitePath = path.join(process.cwd(), 'node_modules', 'vite', 'dist', 'node', 'cli.js');
  if (!fs.existsSync(vitePath)) {
    console.error('❌ Vite CLI not found, attempting to reinstall...');
    execSync('npm install vite@latest', { stdio: 'inherit' });
  }
  
  // Build the application
  console.log('🏗️ Building application...');
  execSync('npm run build:vercel', { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
