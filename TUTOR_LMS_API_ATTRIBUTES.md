# Tutor LMS API Attributes - Course Builder Implementation

## Overview
This document shows the exact API attributes being used when creating courses via the "Generate Complete Course with AI" button.

---

## 1. COURSE API

**Endpoint:** `POST /wp-json/tutor/v1/courses`

**Attributes Being Sent:**
```json
{
  "post_title": "HAZWOPER 8-Hour Initial Supervisor Training Online",
  "post_content": "Full course description...",
  "post_status": "draft",
  "post_author": 1,
  "course_level": "expert",
  "course_duration": 3,
  "course_benefits": "Objective 1\nObjective 2\nObjective 3...",
  "course_requirements": "Requirement 1\nRequirement 2...",
  "course_material_includes": "Material 1\nMaterial 2..."
}
```

**Fields:**
- ✅ `post_title` - Course title
- ✅ `post_content` - Course description
- ✅ `post_status` - "draft" or "publish"
- ✅ `post_author` - User ID (currently: 1)
- ✅ `course_level` - "beginner", "intermediate", or "expert"
- ✅ `course_duration` - Duration in hours
- ✅ `course_benefits` - Learning objectives (newline separated)
- ✅ `course_requirements` - Prerequisites (newline separated)
- ✅ `course_material_includes` - Materials included (newline separated)

---

## 2. TOPIC API

**Endpoint:** `POST /wp-json/tutor/v1/topics`

**Attributes Being Sent:**
```json
{
  "topic_title": "HAZWOPER Supervisory Responsibilities and Regulatory Framework",
  "topic_summary": "This topic introduces supervisors to the HAZWOPER standard...",
  "topic_course_id": 56,
  "topic_author": 1
}
```

**Fields (per your API requirements):**
- ✅ `topic_title` (String, Required) - Topic title
- ✅ `topic_summary` (String, Optional) - Topic description
- ✅ `topic_course_id` (Numeric, Required) - Parent course ID
- ✅ `topic_author` (Numeric, Required) - Author user ID

---

## 3. LESSON API

**Endpoint:** `POST /wp-json/tutor/v1/lessons/`

**Attributes Being Sent:**
```json
{
  "topic_id": 57,
  "lesson_title": "Introduction to HAZWOPER and OSHA Regulations",
  "lesson_content": "Full lesson content here (150-200 words of AI-generated educational content)...",
  "lesson_author": 1
}
```

**Fields (per API spec you provided):**
- ✅ `topic_id` (Numeric, Required) - Parent topic ID
- ✅ `lesson_title` (String, Required) - Lesson title
- ✅ `lesson_content` (String, Optional) - Lesson content
- ✅ `lesson_author` (Numeric, Required) - Author user ID

**Optional Fields NOT Currently Used:**
- ❌ `thumbnail_id` - Could add if we generate/upload images
- ❌ `video` - Could add if AI generates video links
- ❌ `attachments` - Could add downloadable resources
- ❌ `preview` - Could enable preview mode

---

## 4. QUIZ API

**Endpoint:** `POST /wp-json/tutor/v1/quizzes`

**Attributes Being Sent:**
```json
{
  "topic_id": 57,
  "quiz_title": "Topic 1 Assessment",
  "quiz_author": 1,
  "quiz_description": "Test your understanding of this topic",
  "quiz_options": {
    "time_limit": {
      "time_value": 30,
      "time_type": "minutes"
    },
    "feedback_mode": "default",
    "question_layout_view": "question_below_each_other",
    "attempts_allowed": 3,
    "passing_grade": 70,
    "max_questions_for_answer": 4,
    "questions_order": "rand"
  }
}
```

**Fields (per API spec you provided):**
- ✅ `topic_id` (Numeric, Required) - Parent topic ID
- ✅ `quiz_title` (String, Required) - Quiz title
- ✅ `quiz_author` (String, Required) - Author ID (set to 1)
- ✅ `quiz_description` (String, Optional) - Quiz description
- ✅ `quiz_options` (Object, Required):
  - ✅ `time_limit` → `time_value` (30) + `time_type` ("minutes")
  - ✅ `feedback_mode` ("default")
  - ✅ `question_layout_view` ("question_below_each_other")
  - ✅ `attempts_allowed` (3)
  - ✅ `passing_grade` (70)
  - ✅ `max_questions_for_answer` (4)
  - ✅ `questions_order` ("rand")

**Optional Fields NOT Currently Used:**
- ❌ `short_answer_characters_limit` - Could add for short answer questions
- ❌ `open_ended_answer_characters_limit` - Could add for open-ended questions

---

## 5. QUIZ QUESTIONS API

**Endpoint:** `POST /wp-json/tutor/v1/quiz-questions`

### 5A. Single Choice Question
```json
{
  "quiz_id": 123,
  "question_title": "What is the primary purpose of HAZWOPER?",
  "question_type": "single_choice",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "Option B",
  "answer_required": 1,
  "randomize_question": 1,
  "question_mark": 1.00,
  "show_question_mark": 1,
  "answer_explanation": "Detailed explanation...",
  "question_description": "Additional context..."
}
```

### 5B. Multiple Choice Question
```json
{
  "quiz_id": 123,
  "question_title": "Which of the following are safety procedures?",
  "question_type": "multiple_choice",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": ["Option A", "Option C"],
  "answer_required": 1,
  "randomize_question": 1,
  "question_mark": 1.00,
  "show_question_mark": 1,
  "answer_explanation": "Explanation...",
  "question_description": "..."
}
```

### 5C. True/False Question
```json
{
  "quiz_id": 123,
  "question_title": "HAZWOPER training is required by OSHA.",
  "question_type": "true_false",
  "correct_answer": "true",
  "answer_required": 1,
  "randomize_question": 1,
  "question_mark": 1.00,
  "show_question_mark": 1,
  "answer_explanation": "Explanation...",
  "question_description": "..."
}
```

### 5D. Open Ended Question
```json
{
  "quiz_id": 123,
  "question_title": "Describe the role of a HAZWOPER supervisor.",
  "question_type": "open_ended",
  "answer_required": 1,
  "randomize_question": 1,
  "question_mark": 1.00,
  "show_question_mark": 1,
  "answer_explanation": "Key points to include...",
  "question_description": "..."
}
```

**Common Fields for All Question Types:**
- ✅ `quiz_id` (Numeric, Required) - Parent quiz ID
- ✅ `question_title` (String, Required) - The question text
- ✅ `question_type` (String, Required) - Type of question
- ✅ `answer_required` (Numeric) - 1 = required, 0 = optional
- ✅ `randomize_question` (Numeric) - 1 = randomize, 0 = don't
- ✅ `question_mark` (Numeric) - Points for this question
- ✅ `show_question_mark` (Numeric) - 1 = show, 0 = hide
- ✅ `answer_explanation` (String) - Explanation of correct answer
- ✅ `question_description` (String) - Additional context

**Type-Specific Fields:**
- **Single Choice:** `options` (array), `correct_answer` (string - the actual answer text)
- **Multiple Choice:** `options` (array), `correct_answer` (array of strings - the actual answer texts)
- **True/False:** `correct_answer` (string - "true" or "false")
- **Open Ended:** No options or correct_answer needed

---

## Authentication

**Method:** Basic Authentication

```typescript
Authorization: Basic <base64(consumerKey:consumerSecret)>

Headers:
{
  'Authorization': 'Basic <encoded_credentials>',
  'Content-Type': 'application/json'
}
```

**Environment Variables:**
- `TUTOR_BASE_URL` = `https://wordpress-1537294-5934650.cloudwaysapps.com/`
- `TUTOR_API_KEY` = Your WordPress Application Password (consumer key)
- `TUTOR_API_SECRET` = Your WordPress Application Password (consumer secret)

---

## Complete Flow Summary

```
User Input (Title + Description)
          ↓
    [Query Pinecone]
    → Returns 20 relevant docs from Google Drive
          ↓
    [AI Generation with GPT-4o]
    → Generates 3 topics, 9 lessons, 3 quizzes
          ↓
    [Create in Tutor LMS]
          ↓
    ┌─────────────────────────────────────┐
    │ 1. Create Course (POST /courses)    │
    │    Returns: courseId = 56           │
    └─────────────────────────────────────┘
          ↓
    ┌─────────────────────────────────────┐
    │ 2. For Each Topic (3 times):        │
    │    POST /topics                     │
    │    Payload: topic_title,            │
    │             topic_summary,          │
    │             topic_course_id,        │
    │             topic_author            │
    │    Returns: topicId = 57, 58, 59    │
    └─────────────────────────────────────┘
          ↓
    ┌─────────────────────────────────────┐
    │ 3. For Each Lesson (9 times):       │
    │    POST /lessons/                   │
    │    Payload: topic_id,               │
    │             lesson_title,           │
    │             lesson_content,         │
    │             lesson_author           │
    │    Returns: lessonId                │
    └─────────────────────────────────────┘
          ↓
    ┌─────────────────────────────────────┐
    │ 4. For Each Quiz (3 times):         │
    │    POST /quizzes                    │
    │    Payload: topic_id,               │
    │             quiz_title,             │
    │             quiz_author,            │
    │             quiz_description,       │
    │             quiz_options {...}      │
    │    Returns: quizId                  │
    └─────────────────────────────────────┘
          ↓
    ┌─────────────────────────────────────┐
    │ 5. For Each Question (12 times):    │
    │    POST /quiz-questions             │
    │    Payload: quiz_id,                │
    │             question_title,         │
    │             question_type,          │
    │             options,                │
    │             correct_answer,         │
    │             answer_required,        │
    │             randomize_question,     │
    │             question_mark,          │
    │             show_question_mark,     │
    │             answer_explanation,     │
    │             question_description    │
    │    Returns: questionId              │
    └─────────────────────────────────────┘
          ↓
    [Complete] ✅
    Course created with full curriculum!
```

---

## Key Changes Based on Your API Examples

### 1. **Quiz Questions Format** (Major Fix)
**Before:**
```json
{
  "question_options": [
    { "option_title": "A", "is_correct": "1" }
  ]
}
```

**After (Matching API Examples):**
```json
{
  "options": ["Option A", "Option B", "Option C"],
  "correct_answer": "Option B"  // The actual text, not index!
}
```

### 2. **Quiz Options** (Added More Fields)
**Before:**
```json
{
  "quiz_options": {
    "time_limit": {...},
    "attempts_allowed": 3,
    "passing_grade": 70,
    "max_questions_for_answer": 4
  }
}
```

**After (Complete):**
```json
{
  "quiz_options": {
    "time_limit": {...},
    "feedback_mode": "default",
    "question_layout_view": "question_below_each_other",
    "attempts_allowed": 3,
    "passing_grade": 70,
    "max_questions_for_answer": 4,
    "questions_order": "rand"
  }
}
```

### 3. **Removed Invalid Fields**
- ❌ Removed `course_id` from lesson payload (not in API spec)
- ❌ Removed `course_id` from quiz payload (not in API spec)

---

## Detailed Logging

Every API call now logs:
- 📤 **Request Payload** - Exact JSON being sent
- 📥 **Response** - Full API response
- ✅ **Success** - Extracted ID
- ❌ **Failure** - Status code + error message

**Check Logs:**
```bash
tail -f tutor-lms-enhanced-debug.log
```

---

## Try Creating a Course Now!

The API attributes now match the exact examples you provided. Please try creating a course and check the logs to see if topics, lessons, and quizzes are being created successfully.

**Expected Results:**
- ✅ Course created with ID
- ✅ 3 Topics created (IDs: 57, 58, 59)
- ✅ 9 Lessons created (3 per topic)
- ✅ 3 Quizzes created (1 per topic)
- ✅ 12 Questions created (4 per quiz)

The `tutor-lms-enhanced-debug.log` file will show you every single API call and response!





