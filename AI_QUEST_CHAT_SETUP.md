# AI Quest Chat Setup Guide

## Overview

The AI Quest Chat feature provides project owners with an AI-powered assistant to help create engaging quests with tasks for their Web3 projects. The assistant uses Google's Gemini AI to guide users through the quest creation process.

## Features

- **Fixed Floating Button**: A chat icon appears in the bottom-right corner for project owners
- **AI-Powered Guidance**: Gemini AI helps users create quests step by step
- **Project Selection**: Users can select from their owned projects
- **Quest Plan Review**: AI generates a complete quest plan with tasks for review
- **Database Integration**: Automatically creates quests and tasks in the database
- **Real-time Chat**: Interactive chat interface with message history

## Setup Instructions

### 1. Install Dependencies

The Google AI SDK has been added to the project:

```bash
npm install @google/generative-ai
```

### 2. Environment Configuration

Add your Google AI API key to the `.env.local` file:

```env
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

To get a Google AI API key:
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key and paste it in your `.env.local` file

### 3. Component Integration

The AI Quest Chat component is automatically integrated into the authenticated layout and will only appear for authenticated users who own projects.

## How It Works

### For Project Owners

1. **Access the Chat**: Click the chat icon in the bottom-right corner
2. **Select a Project**: Choose from your owned projects
3. **Describe Your Quest**: Tell the AI what type of quest you want to create
4. **AI Guidance**: The AI will ask questions and suggest task types
5. **Review Plan**: Review the generated quest plan with tasks
6. **Create Quest**: Approve the plan to create the quest in the database

### Available Task Types

The AI can create the following task types:

- **social_follow**: Follow social media accounts
- **social_like**: Like social media posts  
- **social_share**: Share social media posts
- **social_comment**: Comment on social media posts
- **download**: Download files/resources
- **form**: Fill out forms
- **visit**: Visit websites for a duration
- **learn**: Educational content with quiz
- **quiz**: Standalone quiz questions
- **manual**: Manual verification tasks

### AI Conversation Flow

1. **Welcome**: AI greets user and explains the process
2. **Project Selection**: User selects a project to create quests for
3. **Quest Planning**: AI asks about quest goals, theme, and requirements
4. **Task Suggestions**: AI suggests appropriate task types and configurations
5. **Plan Generation**: AI creates a complete quest plan with tasks
6. **Review & Approval**: User reviews the plan and approves creation

## Technical Implementation

### Components

- **`components/ai-quest-chat.tsx`**: Main chat interface component
- **`app/api/ai-quest-chat/route.ts`**: API route for AI communication

### Database Integration

The feature integrates with existing database tables:

- **`quests`**: Stores quest information
- **`tasks`**: Stores task details with type-specific fields
- **`projects`**: Links quests to user-owned projects

### Security

- Only authenticated users can access the chat
- Users can only create quests for projects they own
- API key is stored securely in environment variables

## Usage Examples

### Example 1: Social Media Quest

**User**: "I want to create a quest for my DeFi project that encourages users to follow us on Twitter and join our Discord"

**AI Response**: 
- Asks about reward amounts
- Suggests social_follow tasks for Twitter and Discord
- Creates a quest plan with appropriate XP rewards
- Generates tasks with proper social platform configurations

### Example 2: Educational Quest

**User**: "Create a quest that teaches users about our tokenomics"

**AI Response**:
- Suggests learn task type with educational content
- Adds quiz questions to test understanding
- Includes download task for whitepaper
- Creates a comprehensive educational quest

## Troubleshooting

### Common Issues

1. **API Key Not Set**: Ensure `GOOGLE_AI_API_KEY` is set in `.env.local`
2. **No Projects**: Users must own at least one project to use the feature
3. **Network Errors**: Check internet connection and API key validity

### Development

To test the feature:

1. Start the development server: `npm run dev`
2. Log in as a project owner
3. Look for the chat icon in the bottom-right corner
4. Click to open the chat interface

## Future Enhancements

Potential improvements:

- **Quest Templates**: Pre-built quest templates for common use cases
- **Analytics**: Track quest creation and completion rates
- **Multi-language Support**: Support for different languages
- **Advanced Task Types**: More sophisticated task configurations
- **Bulk Operations**: Create multiple quests at once

## Support

For issues or questions about the AI Quest Chat feature, please refer to the project documentation or contact the development team.