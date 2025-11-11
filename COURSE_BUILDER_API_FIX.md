# Course Builder API Improvements

## Overview
Fixed the course builder functionality to properly create lessons and quizzes in Tutor LMS Pro by aligning API requests with your actual Tutor LMS instance's REST API requirements.

## What Happened
Based on your error logs, the topics failed to create because the API rejected the parameters. The error message revealed:
```
"topic_course_id": ["Topic Course ID is required"]
"topic_title": ["Topic Title is required"]
"topic_author": ["Topic Author is required"]
```

This showed that your Tutor LMS instance requires **prefixed parameter names** (e.g., `topic_title`, `lesson_content`, `quiz_description`) rather than the simplified names in some API documentation.

## Important Discovery
Your Tutor LMS instance uses **prefixed parameter names** for all endpoints. All parameters have been updated to match your API's actual requirements based on the error messages from your server.

## Changes Made

### 1. Topic API (Fixed)
**File:** `src/app/api/course-builder/tutor-lms-enhanced/route.ts`

**Before (Incorrect):**
```json
{
  "title": "...",
  "summary": "...",
  "course_id": 123
}
```

**After (Correct for your API):**
```json
{
  "topic_title": "...",
  "topic_summary": "...",
  "topic_course_id": 123,
  "topic_author": 1
}
```

**API Endpoint:** `POST /wp-json/tutor/v1/topics`

**Required Attributes (per your API error messages):**
- `topic_title` (String) - Topic title
- `topic_summary` (String) - Topic summary/description
- `topic_course_id` (Numeric) - Parent course ID
- `topic_author` (Numeric) - Author user ID

---

### 2. Lesson API (Fixed)
**File:** `src/app/api/course-builder/tutor-lms-enhanced/route.ts`

**Before (Incorrect):**
```json
{
  "title": "...",
  "content": "...",
  "topic_id": 456
}
```

**After (Correct for your API):**
```json
{
  "lesson_title": "...",
  "lesson_content": "...",
  "lesson_topic_id": 456,
  "lesson_course_id": 123,
  "lesson_author": 1
}
```

**API Endpoint:** `POST /wp-json/tutor/v1/lessons`

**Required Attributes:**
- `lesson_title` (String) - Lesson title
- `lesson_content` (String) - Lesson content
- `lesson_topic_id` (Numeric) - Parent topic ID
- `lesson_course_id` (Numeric) - Parent course ID
- `lesson_author` (Numeric) - Author user ID

---

### 3. Quiz API (Fixed)
**File:** `src/app/api/course-builder/tutor-lms-enhanced/route.ts`

**Before (Incorrect):**
```json
{
  "title": "...",
  "description": "...",
  "topic_id": 456,
  "time_limit": {...},
  "passing_grade": 70
}
```

**After (Correct for your API):**
```json
{
  "quiz_title": "...",
  "quiz_description": "...",
  "quiz_topic_id": 456,
  "quiz_course_id": 123,
  "quiz_author": 1,
  "time_limit": {
    "time_value": 30,
    "time_type": "minutes"
  },
  "passing_grade": 70,
  "max_question_allowed": 10,
  "max_attempts_allowed": 3
}
```

**API Endpoint:** `POST /wp-json/tutor/v1/quiz` (singular, not "quizzes")

**Required Attributes:**
- `quiz_title` (String) - Quiz title
- `quiz_description` (String) - Quiz description
- `quiz_topic_id` (Numeric) - Parent topic ID
- `quiz_course_id` (Numeric) - Parent course ID
- `quiz_author` (Numeric) - Author user ID

**Optional Attributes:**
- `time_limit` - Time limit settings
- `passing_grade` - Minimum grade to pass
- `max_question_allowed` - Maximum questions to show
- `max_attempts_allowed` - Maximum attempts allowed

---

### 4. Quiz Questions API (Fixed)
**File:** `src/app/api/course-builder/tutor-lms-enhanced/route.ts`

**Before (Incorrect):**
```json
{
  "title": "...",
  "description": "...",
  "type": "single_choice",
  "mark": 1,
  "quiz_id": 789,
  "options": [...]
}
```

**After (Correct for your API):**
```json
{
  "question_title": "...",
  "question_description": "...",
  "question_type": "single_choice",
  "question_mark": 1,
  "quiz_id": 789,
  "question_options": [
    {
      "option_title": "Option A",
      "is_correct": "1"
    },
    {
      "option_title": "Option B",
      "is_correct": "0"
    }
  ]
}
```

**API Endpoint:** `POST /wp-json/tutor/v1/quiz-questions`

**Required Attributes:**
- `question_title` (String) - The question text
- `question_description` (String) - Explanation/description
- `question_type` (String) - Type of question
- `question_mark` (Numeric) - Points for this question
- `quiz_id` (Numeric) - Parent quiz ID
- `question_options` (Array) - Array of answer options (for choice-based questions)

**Supported Question Types:**
- `single_choice` - Multiple choice with one correct answer
- `multiple_choice` - Multiple choice with multiple correct answers
- `true_false` - True/False questions
- `open_ended` - Short answer/essay questions
- `fill_in_blanks` - Fill in the blank questions
- `ordering` - Ordering questions

---

## Additional Improvements

### 1. Better Error Handling
- Added detailed error logging with status codes and response text
- Added validation for extracted IDs from API responses
- Graceful handling of failures (continues with next item instead of stopping)

### 2. Enhanced Logging
- All API calls now log both request and response data
- Structured logging with relevant context
- Logs saved to `tutor-lms-enhanced-debug.log` for debugging

### 3. Response ID Extraction
Improved ID extraction to handle different response formats:
```typescript
const topicId = topicResult.data?.id || topicResult.data || topicResult.id
```

This handles:
- `{ data: { id: 123 } }` - Standard response
- `{ data: 123 }` - Direct ID in data field
- `{ id: 123 }` - ID at root level

---

## Testing the Changes

### 1. Test Course Creation
1. Navigate to Admin Dashboard → Course Builder
2. Fill in:
   - Course Title: "Test Course"
   - Course Description: "Testing lesson and quiz creation"
   - Number of Topics: 2
   - Lessons Per Topic: 2
3. Click "Generate Complete Course with AI"
4. Monitor the progress modal for any errors

### 2. Verify in Tutor LMS
1. Log into your WordPress/Tutor LMS admin
2. Navigate to Courses → All Courses
3. Find the created course
4. Click "Edit" to verify:
   - ✅ Course title and description are correct
   - ✅ Topics are created (check Curriculum tab)
   - ✅ Lessons are created under each topic
   - ✅ Quizzes are created for each topic
   - ✅ Quiz questions are properly added with correct answers

### 3. Check Logs
Review `tutor-lms-enhanced-debug.log` for detailed execution logs:
```bash
tail -f tutor-lms-enhanced-debug.log
```

Look for:
- ✅ "Topic created successfully with ID: X"
- ✅ "Lesson created successfully with ID: X"
- ✅ "Quiz created successfully with ID: X"
- ✅ "single_choice question created successfully"
- ❌ Any error messages (will include full context)

---

## API Documentation Reference

All changes are based on the official Tutor LMS Pro REST API documentation:
https://docs.themeum.com/tutor-lms/developer-documentation/rest-apis-for-tutor-lms-pro/

### Key Sections Referenced:
- **Topic API** - Create topics under courses
- **Lesson API** - Create lessons under topics
- **Quiz API** - Create quizzes under topics
- **Quiz Question API** - Add questions to quizzes

---

## Expected Behavior

After these fixes, the course builder should:

1. ✅ Create the basic course with title, description, and metadata
2. ✅ Create topics under the course
3. ✅ Create lessons under each topic with AI-generated content
4. ✅ Create quizzes for each topic
5. ✅ Add diverse question types to quizzes (single choice, true/false, multiple choice, open-ended)
6. ✅ Set correct answers for each question
7. ✅ Add course tags for discoverability

---

## Troubleshooting

### If Lessons Are Not Created:
1. Check `tutor-lms-enhanced-debug.log` for "Failed to create lesson" errors
2. Verify `TUTOR_BASE_URL`, `TUTOR_API_KEY`, and `TUTOR_API_SECRET` in `.env.local`
3. Ensure topics were created successfully (lessons need valid topic IDs)
4. Check that the Tutor LMS REST API is enabled on your WordPress site

### If Quizzes Are Not Created:
1. Check the debug log for "Failed to create quiz" errors
2. Verify the quiz endpoint is accessible: `POST /wp-json/tutor/v1/quiz`
3. Ensure topics were created successfully (quizzes need valid topic IDs)
4. Check quiz settings are valid (time_limit, passing_grade, etc.)

### If Quiz Questions Are Not Created:
1. Check the debug log for "Failed to create question" errors
2. Verify quizzes were created successfully (questions need valid quiz IDs)
3. Check that question options are properly formatted
4. Ensure question types are supported by your Tutor LMS version

---

## Environment Variables Required

Ensure these are set in `.env.local`:

```env
TUTOR_BASE_URL=https://your-wordpress-site.com/
TUTOR_API_KEY=your_consumer_key
TUTOR_API_SECRET=your_consumer_secret
OPENAI_API_KEY=your_openai_api_key
```

---

## Next Steps

1. Test the course builder with a small course (2 topics, 2 lessons each)
2. Verify all content appears correctly in Tutor LMS
3. Take a quiz to ensure questions and answers work correctly
4. If successful, create larger courses as needed

---

## Support

If issues persist:
1. Check the `tutor-lms-enhanced-debug.log` file
2. Review the Tutor LMS REST API documentation
3. Verify API credentials are correct
4. Test API endpoints directly using a tool like Postman

