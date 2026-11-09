#!/usr/bin/env node

/**
 * Test script for Copilot API
 * Usage: node test-api.js
 */

const API_URL = 'http://localhost:3000/api/copilot'

async function testHealthCheck() {
  console.log('\n📋 Testing health check...')
  try {
    const response = await fetch(API_URL)
    const data = await response.json()
    console.log('✅ Health check passed')
    console.log('   Model:', data.model)
    console.log('   AWS Configured:', data.awsConfigured)
    return data.awsConfigured
  } catch (error) {
    console.error('❌ Health check failed:', error.message)
    return false
  }
}

async function testCopilotRequest(prompt, mode = 'command') {
  console.log(`\n🤖 Testing Copilot request (${mode} mode)...`)
  console.log('   Prompt:', prompt)
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        context: { mode }
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      console.log('✅ Request successful')
      console.log('   Response:', data.content.substring(0, 100) + '...')
      console.log('   Model:', data.model)
      console.log('   Timestamp:', data.timestamp)
    } else {
      console.error('❌ Request failed:', data.error)
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

async function main() {
  console.log('🚀 TVQ Work Copilot API Test')
  console.log('=============================')
  
  const awsConfigured = await testHealthCheck()
  
  if (!awsConfigured) {
    console.log('\n⚠️  AWS credentials not configured')
    console.log('   The API will use mock responses')
    console.log('   To enable AWS Bedrock, update .env.local')
  }
  
  // Test Command Mode
  await testCopilotRequest('Chia việc cho team IT, giao Minh backend', 'command')
  
  // Test Executive Mode
  await testCopilotRequest('Phân tích tình hình toàn công ty', 'executive')
  
  console.log('\n✨ Test completed')
}

main().catch(console.error)
