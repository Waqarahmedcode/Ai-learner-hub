export const PLATFORMS = [
  'Facebook Page',
  'Facebook Group',
  'Instagram',
  'YouTube Shorts',
  'Website',
  'General Project',
] as const;

export const CONTENT_PLATFORMS = [
  'Facebook Page',
  'Facebook Group',
  'Instagram',
  'YouTube Shorts',
  'Website',
] as const;

export const FORMATS = [
  '8-second Reel',
  '16-second Reel',
  '30-second Reel',
  '60-second Tutorial',
  '100-second Tutorial',
  'Static Post',
  'Carousel',
  'Story Sequence',
  'Community Question',
  'Promotional Advertisement',
  'Educational Tutorial',
  'Website Article',
  'Thumbnail Copy',
  'Video-generation Prompt',
] as const;

export const TONES = [
  'Educational',
  'Premium',
  'Casual',
  'Expert',
  'Urgent',
  'Inspirational',
  'Beginner Friendly',
  'Professional',
  'High Conversion',
  'Community Focused',
] as const;

export const LANGUAGES = [
  'English',
  'Urdu',
  'Roman Urdu',
  'Bilingual English and Urdu',
] as const;

export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;

export const TASK_STATUSES = [
  'Not Started',
  'In Progress',
  'Waiting for Asset',
  'Ready for Review',
  'Changes Required',
  'Approved',
  'Scheduled',
  'Completed',
] as const;

export const CONTENT_STATUSES = [
  'Idea',
  'Research',
  'Script Draft',
  'Visual Required',
  'Video Generation',
  'Editing',
  'Ready for Review',
  'Changes Required',
  'Approved',
  'Scheduled',
  'Published',
  'Results Added',
] as const;

export const ASSIGNEES = ['Waqar Ahmed', 'Sadia'] as const;

export const DEFAULT_LINKS = [
  { label: 'Website', url: 'https://ailearnerhub.netlify.app/', sort_order: 0 },
  { label: 'Facebook Page', url: 'https://www.facebook.com/share/14mHy7bsaxH/', sort_order: 1 },
  { label: 'Facebook Group', url: 'https://www.facebook.com/share/g/18vVRZM7Nf/', sort_order: 2 },
  { label: 'Instagram', url: 'https://www.instagram.com/ailearnerhub?igsh=OW9qa3dkdGg4b2pk', sort_order: 3 },
];

export const SUGGESTED_REWARDS = [
  'Beginner AI Prompt Pack',
  'AI Tools Starter Guide',
  'Tutorial PDF',
  'Content Templates',
  'Members-only Learning Session',
  'AI Content Checklist',
];

export const FB_PAGE_METRICS = [
  'Followers', 'New followers', 'Reach', 'Impressions', 'Engagement',
  'Likes', 'Comments', 'Shares', 'Page visits', 'Link clicks',
];

export const FB_GROUP_METRICS = [
  'Members', 'New members', 'Active members', 'Posts', 'Comments',
  'Reactions', 'Group invitations', 'Group visits',
];

export const IG_METRICS = [
  'Followers', 'New followers', 'Reach', 'Impressions', 'Profile visits',
  'Likes', 'Comments', 'Shares', 'Saves', 'Reel plays', 'Story views', 'Website clicks',
];

export const WEBSITE_METRICS = [
  'Visitors', 'Page views', 'Sessions', 'Referral source', 'Social clicks', 'Average session duration',
];

export const CONTENT_PERFORMANCE_METRICS = [
  'Reach', 'Impressions', 'Views', 'Likes', 'Comments',
  'Shares', 'Saves', 'Clicks', 'Followers gained', 'Group members gained',
];

export const GENERATION_SECTIONS = [
  { key: 'contentTitle', label: 'Content Title' },
  { key: 'hooks', label: 'Three Scroll-Stopping Hooks' },
  { key: 'voiceOverScript', label: 'Final Voice-Over Script' },
  { key: 'sceneTimeline', label: 'Scene-by-Scene Timeline' },
  { key: 'presenterActions', label: 'Presenter Actions' },
  { key: 'screenFootage', label: 'Real Screen-Footage Instructions' },
  { key: 'onScreenCaptions', label: 'On-Screen Captions' },
  { key: 'videoPrompt', label: 'AI Video-Generation Prompt' },
  { key: 'instagramCaption', label: 'Instagram Caption' },
  { key: 'facebookPageCaption', label: 'Facebook Page Caption' },
  { key: 'facebookGroupCaption', label: 'Facebook Group Caption' },
  { key: 'carouselCopy', label: 'Carousel Slide Copy' },
  { key: 'storyFrames', label: 'Story Frames' },
  { key: 'cta', label: 'CTA' },
  { key: 'keywords', label: 'Keywords' },
  { key: 'hashtags', label: 'Hashtag Suggestions' },
  { key: 'thumbnailHeadline', label: 'Thumbnail Headline' },
  { key: 'postingTime', label: 'Recommended Posting Time' },
  { key: 'publishingChecklist', label: 'Publishing Checklist' },
  { key: 'targetAudience', label: 'Target Audience' },
  { key: 'expectedAction', label: 'Expected User Action' },
  { key: 'objective', label: 'Content Objective' },
];
