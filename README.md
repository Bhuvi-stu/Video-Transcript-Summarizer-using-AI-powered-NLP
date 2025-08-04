# YouTube Video Summarizer

A web application that summarizes YouTube videos when you paste a video link.

## Features

- Paste a YouTube video URL to get a text summary of the video content
- Shows video thumbnail, title, and channel information
- Primarily uses video transcripts for summarization
- Falls back to video descriptions if transcripts are unavailable
- Clean and responsive user interface

## How to Use

1. Open `index.html` in your web browser
2. Paste a YouTube video URL in the input field
3. Click the "Summarize" button
4. Wait for the summary to be generated
5. View the summary along with the video information

## How It Works

This application:
1. Extracts the video ID from the YouTube URL
2. Fetches video details using YouTube's oEmbed API
3. Attempts to fetch the video transcript using a free API
4. If no transcript is available, uses the video description
5. Generates a summary using the available content
6. Displays the results with the video information

## Limitations

- Works best with YouTube videos that have captions/transcripts available
- Summary quality depends on the available text content
- May not work with some private or age-restricted videos
- Does not require any API keys, but is limited by free service capabilities

## Technologies Used

- HTML5
- CSS3
- JavaScript (Fetch API for making HTTP requests)
- YouTube oEmbed API (for video metadata)
- External transcript and metadata APIs

## Future Improvements

- Advanced natural language processing for better summaries
- Support for multiple languages
- Options for different summary lengths
- Support for other video platforms 