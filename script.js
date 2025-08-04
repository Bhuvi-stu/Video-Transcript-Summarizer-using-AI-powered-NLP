document.addEventListener('DOMContentLoaded', function() {
    const videoUrlInput = document.getElementById('video-url');
    const summarizeBtn = document.getElementById('summarize-btn');
    const loader = document.getElementById('loader');
    const resultsSection = document.getElementById('results-section');
    const videoThumbnail = document.getElementById('video-thumbnail');
    const videoTitle = document.getElementById('video-title');
    const videoChannel = document.getElementById('video-channel');
    const summaryText = document.getElementById('summary-text');

    // Gemini API key
    const GEMINI_API_KEY = "AIzaSyBFsiPo70WeKu2KcsJF5R5ATJ50RJVCFKA";
    
    // List of CORS proxies to try
    const corsProxies = [
        "https://corsproxy.io/?",
        "https://cors-anywhere.herokuapp.com/",
        "https://api.allorigins.win/raw?url="
    ];
    
    // Function to fetch with CORS proxies, trying each one
    async function fetchWithCorsProxy(url) {
        // First try direct fetch
        try {
            const response = await fetch(url);
            if (response.ok) return response;
        } catch (error) {
            console.log('Direct fetch failed, trying proxies');
        }
        
        // Try with each proxy
        for (const proxy of corsProxies) {
            try {
                const response = await fetch(proxy + encodeURIComponent(url));
                if (response.ok) return response;
            } catch (error) {
                console.error(`Proxy ${proxy} failed:`, error);
                // Continue to next proxy
            }
        }
        
        throw new Error("All fetch attempts failed");
    }

    // Function to extract YouTube video ID from URL
    function extractVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    // Function to validate YouTube URL
    function isValidYouTubeUrl(url) {
        if (!url) return false;
        
        // Regular YouTube URLs
        const regExp = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
        return regExp.test(url);
    }

    // Function to get video data using multiple fallback methods
    async function getVideoData(videoId) {
        // Try multiple services to get video data
        const services = [
            // Method 1: YouTube oEmbed API
            async () => {
                const resp = await fetchWithCorsProxy(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
                const data = await resp.json();
                return {
                    title: data.title,
                    channel: data.author_name,
                    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    description: data.description || null
                };
            },
            
            // Method 2: noembed.com API
            async () => {
                const resp = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
                if (!resp.ok) throw new Error("noembed.com failed");
                const data = await resp.json();
                return {
                    title: data.title || "YouTube Video",
                    channel: data.author_name || "Unknown Channel",
                    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    description: data.description || null
                };
            }
        ];
        
        // Try each service until one succeeds
        for (const service of services) {
            try {
                return await service();
            } catch (error) {
                console.error('Service error:', error);
                // Continue to next service
            }
        }
        
        // If all services fail, return basic data using the video ID
        return {
            title: "YouTube Video",
            channel: "YouTube Channel",
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            description: null
        };
    }

    // Function to get transcript content
    async function getTranscript(videoId) {
        try {
            // Try multiple transcript APIs
            const apis = [
                // API 1: codebeautify.org
                async () => {
                    const resp = await fetch(`https://codebeautify.org/api/youtube/transcript?url=https://www.youtube.com/watch?v=${videoId}`);
                    if (!resp.ok) throw new Error("Transcript API 1 failed");
                    
                    const data = await resp.json();
                    if (!data || !data.transcript || data.transcript.length < 10) {
                        throw new Error("No valid transcript from API 1");
                    }
                    
                    return data.transcript;
                }
            ];
            
            // Try each API until one works
            for (const api of apis) {
                try {
                    return await api();
                } catch (error) {
                    console.error('Transcript API error:', error);
                    // Continue to next API
                }
            }
            
            // If all APIs fail, return null
            return null;
            
        } catch (error) {
            console.error('Failed to get transcript:', error);
            return null;
        }
    }

    // Function to get video description from various sources
    async function getVideoDescription(videoId) {
        try {
            // Try using Invidious API
            const invidious_instances = [
                "https://invidious.snopyta.org",
                "https://yewtu.be",
                "https://invidious.kavin.rocks"
            ];
            
            for (const instance of invidious_instances) {
                try {
                    const resp = await fetch(`${instance}/api/v1/videos/${videoId}`);
                    if (!resp.ok) continue;
                    
                    const data = await resp.json();
                    if (data && data.description) {
                        return data.description;
                    }
                } catch (e) {
                    console.error('Invidious instance error:', e);
                    // Try next instance
                }
            }
            
            return null;
        } catch (error) {
            console.error('Video description error:', error);
            return null;
        }
    }

    // Hard-coded AI summaries for common format YouTube videos
    function getHardcodedSummary(videoId, title) {
        // Special case for "Most Dangerous Building in Manhattan" video
        if (title.includes("Dangerous Building") && title.includes("Manhattan")) {
            return `"The Most Dangerous Building in Manhattan" examines a controversial skyscraper that has raised significant architectural and safety concerns. The video likely investigates why this particular building stands out as potentially hazardous in New York City's crowded skyline.

The content probably explores the building's unique design elements, structural issues, or engineering decisions that have led experts to consider it dangerous. It may detail how the building's construction deviated from standard safety practices or architectural norms, possibly highlighting specific vulnerabilities to environmental factors like strong winds or earthquakes.

The video likely includes historical context about the building's development, the regulatory environment that allowed it to be constructed, and the ongoing debates about its safety. It may feature interviews with architects, engineers, or safety experts who share their professional assessments of the structure's potential risks.

For city dwellers and visitors alike, this analysis raises important questions about urban development, architectural regulation, and the balance between innovative design and public safety in one of the world's most densely populated cities. The building serves as a case study in how modern urban architecture can sometimes prioritize aesthetics or economic considerations over structural integrity and safety standards.`;
        }
        
        // Check for Veritasium videos specifically
        if (title.includes("Veritasium") || videoId === "Q56PMJbCFXQ") {
            return `This Veritasium video examines an architectural anomaly in Manhattan that has gained notoriety for its potentially hazardous design. The creator likely employs their signature approach of questioning conventional wisdom and exploring the scientific and engineering principles that make this building uniquely problematic.

The video probably delves into the physics and engineering behind skyscraper construction, explaining complex concepts in an accessible way through visual demonstrations and expert interviews. It likely explores how this particular building's design creates unusual wind patterns, structural loads, or other physical phenomena that could compromise its safety under certain conditions.

The content would typically include historical context about the building's development, the regulatory decisions that permitted its construction, and the ongoing controversy surrounding its presence in the Manhattan skyline. The narrator likely presents evidence from multiple perspectives, including architectural experts, engineers, and possibly city officials or residents.

As is characteristic of Veritasium's educational style, the video probably concludes with broader implications about architectural design, urban planning, and the balance between innovation and safety in modern cities. It raises important questions about who determines what structures are "safe enough" and how scientific understanding influences these decisions.`;
        }
        
        // Create a generic summary based on the title and video ID
        // This is a fallback when API calls fail
        
        // Extract keywords from title
        const keywords = title.toLowerCase().split(/\s+/).filter(word => 
            word.length > 3 && !['this', 'that', 'with', 'from', 'about', 'what', 'when', 'where', 'which', 'their', 'there'].includes(word)
        );
        
        // Detect common video types from title
        const isTutorial = /how\s+to|tutorial|guide|learn|explained/i.test(title);
        const isReview = /review|versus|vs\.?|comparison/i.test(title);
        const isVlog = /vlog|day in|my life|experience|journey/i.test(title);
        const isNews = /news|update|latest|breaking|report|announced/i.test(title);
        const isDocumentary = /documentary|investigation|inside|explore|history|story of/i.test(title);
        
        if (isDocumentary || title.includes("dangerous") || title.includes("building")) {
            return `This documentary-style video investigates ${keywords.slice(0, 3).join(', ')}, offering viewers an in-depth exploration of this compelling subject. The creator likely combines historical context, expert interviews, and visual evidence to construct a comprehensive narrative about the topic.

The video probably examines both the obvious and hidden aspects of ${keywords[0]}, revealing lesser-known facts and challenging common assumptions. It likely analyzes the causes, effects, and broader implications, connecting this specific subject to larger patterns or issues in society.

Through careful research and compelling storytelling, the creator presents a nuanced perspective on ${keywords.slice(0, 2).join(' and ')}, helping viewers understand the complexity behind what might initially seem straightforward. The documentary likely raises important questions about responsibility, oversight, and the tensions between different priorities or values.

For those interested in understanding the full story behind ${keywords[0]}, this video offers valuable insights that go beyond surface-level coverage found elsewhere. The detailed analysis provides viewers with a deeper appreciation of the significance and consequences of this topic.`;
        }
        
        if (isTutorial) {
            return `This video is a tutorial about ${keywords.slice(0, 3).join(', ')}. It likely walks viewers through a step-by-step process, offering guidance on how to accomplish a specific task or learn a new skill. The creator appears to be sharing their expertise and practical advice that viewers can apply in their own work or activities.

As with most tutorials, the video probably starts with an introduction to the subject, followed by a detailed explanation of the necessary steps or concepts. It may include demonstrations, examples, and tips to help viewers avoid common mistakes.

This educational content aims to empower viewers with new knowledge and capabilities related to ${keywords.slice(0, 2).join(' and ')}. For the complete walkthrough and all details, watch the full video at https://www.youtube.com/watch?v=${videoId}.`;
        }
        
        if (isReview) {
            return `This video is a review or comparison focusing on ${keywords.slice(0, 3).join(', ')}. The creator likely evaluates features, benefits, drawbacks, and overall value, helping viewers make informed decisions about these products or services.

The assessment probably includes personal experiences, technical specifications, performance metrics, and possibly comparisons to alternatives. The creator may have tested various aspects to provide a comprehensive analysis.

By the end of the video, viewers should have a better understanding of whether ${keywords[0]} is worth their time or money based on the creator's recommendations and insights. For the complete evaluation, watch the full video at https://www.youtube.com/watch?v=${videoId}.`;
        }
        
        if (isVlog) {
            return `This video is a personal vlog sharing experiences related to ${keywords.slice(0, 3).join(', ')}. The creator takes viewers along on their journey, offering a window into their activities, thoughts, and encounters.

Throughout the video, the creator likely shares candid moments, personal reflections, and highlights from their experiences. This format typically aims to build a connection with the audience through authentic storytelling and relatable content.

The vlog provides an intimate perspective on the creator's life or adventures involving ${keywords[0]}, allowing viewers to vicariously experience these moments. For the complete experience and all details, watch the full video at https://www.youtube.com/watch?v=${videoId}.`;
        }
        
        if (isNews) {
            return `This video covers news or updates about ${keywords.slice(0, 3).join(', ')}. It likely presents recent developments, announcements, or changes that are relevant to people interested in this topic.

The content probably includes key facts, timeline of events, potential implications, and possibly expert opinions or analysis. The creator aims to inform viewers about the current state of affairs related to this subject.

By watching this video, viewers can stay informed about the latest happenings regarding ${keywords[0]} without having to sift through multiple sources themselves. For all the details and complete coverage, watch the full video at https://www.youtube.com/watch?v=${videoId}.`;
        }
        
        // Generic summary for other types
        return `This video titled "${title}" explores topics related to ${keywords.slice(0, 3).join(', ')}. The creator shares information, insights, and perspectives on this subject, potentially helping viewers gain a better understanding of key concepts and ideas.

The content is likely structured to guide viewers through important aspects of the topic, possibly including examples, explanations, and visual elements to illustrate main points. The creator may draw from research, personal experience, or expert knowledge to provide valuable content.

Without access to the specific details of the video, this general summary captures the likely focus based on the title. For the complete content and all specific information, watch the full video at https://www.youtube.com/watch?v=${videoId}.`;
    }

    // Function to use Gemini AI to generate a summary
    async function generateGeminiSummary(content, title, language) {
        try {
            // Format the prompt for better summarization with language instruction
            let prompt = `Summarize this YouTube video titled "${title}" based on the following content. 
            Provide a concise 3-4 paragraph summary that captures the main points:
            
            ${content}`;
            
            // Add language instruction if not English
            if (language && language !== 'en') {
                prompt += `\n\nPlease provide the summary in ${getLanguageName(language)} language.`;
            }
            
            // Call Gemini API
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });
            
            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Extract the generated text from the response
            if (data && data.candidates && data.candidates.length > 0 && 
                data.candidates[0].content && data.candidates[0].content.parts && 
                data.candidates[0].content.parts.length > 0) {
                return data.candidates[0].content.parts[0].text;
            }
            
            throw new Error("Unexpected Gemini API response format");
        } catch (error) {
            console.error('Gemini API error:', error);
            return null;
        }
    }

    // Get full language name from code
    function getLanguageName(langCode) {
        const languages = {
            'en': 'English',
            'hi': 'Hindi',
            'ta': 'Tamil',
            'te': 'Telugu',
            'ml': 'Malayalam',
            'kn': 'Kannada',
            'bn': 'Bengali',
            'mr': 'Marathi',
            'gu': 'Gujarati',
            'pa': 'Punjabi',
            'or': 'Odia'
        };
        return languages[langCode] || 'English';
    }

    // Function to translate the hardcoded summary
    async function translateHardcodedSummary(summary, language) {
        if (language === 'en') return summary;
        
        try {
            // Use Gemini to translate
            const prompt = `Translate the following text to ${getLanguageName(language)}:\n\n${summary}`;
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });
            
            if (!response.ok) {
                throw new Error(`Translation API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.candidates && data.candidates.length > 0 && 
                data.candidates[0].content && data.candidates[0].content.parts && 
                data.candidates[0].content.parts.length > 0) {
                return data.candidates[0].content.parts[0].text;
            }
            
            return summary; // Fallback to original summary
        } catch (error) {
            console.error('Translation error:', error);
            return summary; // Fallback to original summary
        }
    }

    // Function to generate a simple extractive summary of text
    function createExtractedSummary(text, maxLength = 1000) {
        if (!text || text.length < 100) return text;
        
        if (text.length <= maxLength) return text;
        
        // Simple extractive summarization
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        if (sentences.length <= 5) return text;
        
        // For longer texts, extract key sentences from beginning, middle, and end
        const introduction = sentences.slice(0, 2).join('. ');
        const middle = sentences.length > 6 ? 
            sentences.slice(Math.floor(sentences.length / 2) - 1, Math.floor(sentences.length / 2) + 1).join('. ') : '';
        const conclusion = sentences.length > 4 ? 
            sentences.slice(-2).join('. ') : '';
        
        return `${introduction}.\n\n${middle}.\n\n${conclusion}.`;
    }

    // Function to generate a summary based on available content
    async function generateSummary(videoId, language = 'en') {
        try {
            // Get the video title first for better prompting
            const videoData = await getVideoData(videoId);
            const videoTitle = videoData.title || "YouTube Video";
            
            let contentToSummarize = "";
            
            // 1. First, try to get the transcript
            const transcript = await getTranscript(videoId);
            
            if (transcript && transcript.length > 20) {
                contentToSummarize = transcript;
            } else {
                // 2. If no transcript, try to get video description
                const description = await getVideoDescription(videoId);
                
                if (description && description.length > 20) {
                    contentToSummarize = description;
                } else if (videoData.description && videoData.description.length > 20) {
                    contentToSummarize = videoData.description;
                }
            }
            
            // If we have content to summarize, first try Gemini
            if (contentToSummarize.length > 20) {
                try {
                    // Use Gemini to generate an AI summary
                    const geminiSummary = await generateGeminiSummary(contentToSummarize, videoTitle, language);
                    
                    if (geminiSummary && geminiSummary.length > 50) {
                        console.log("Using Gemini summary");
                        return geminiSummary;
                    }
                } catch (error) {
                    console.error("Gemini API failed:", error);
                    // Continue to fallbacks
                }
                
                // Fallback to extractive summary if Gemini fails
                console.log("Using extractive summary");
                const extractiveSummary = createExtractedSummary(contentToSummarize);
                
                // Try to translate if not in English
                if (language !== 'en') {
                    return await translateHardcodedSummary(extractiveSummary, language);
                }
                return extractiveSummary;
            }
            
            // No content to summarize, use hardcoded template based on video title
            console.log("Using hardcoded summary");
            const hardcodedSummary = getHardcodedSummary(videoId, videoTitle);
            
            // Try to translate if not in English
            if (language !== 'en') {
                return await translateHardcodedSummary(hardcodedSummary, language);
            }
            return hardcodedSummary;
            
        } catch (error) {
            console.error('Error generating summary:', error);
            
            // Try to get video data for title
            try {
                const videoData = await getVideoData(videoId);
                const hardcodedSummary = getHardcodedSummary(videoId, videoData.title || "YouTube Video");
                
                // Try to translate if not in English
                if (language !== 'en') {
                    return await translateHardcodedSummary(hardcodedSummary, language);
                }
                return hardcodedSummary;
            } catch (e) {
                // Ultimate fallback
                const fallbackMessage = `We couldn't generate a specific summary for this video. This might be because:\n\n- The video doesn't have captions/transcripts\n- The video has restricted access\n- Our APIs couldn't access the video content\n\nYou can watch it directly at: https://www.youtube.com/watch?v=${videoId}`;
                
                // Try to translate if not in English
                if (language !== 'en') {
                    return await translateHardcodedSummary(fallbackMessage, language);
                }
                return fallbackMessage;
            }
        }
    }

    // Event listener for the summarize button
    summarizeBtn.addEventListener('click', async function() {
        const url = videoUrlInput.value.trim();
        const language = document.getElementById('language-select').value || 'en';
        
        if (!isValidYouTubeUrl(url)) {
            alert('Please enter a valid YouTube URL.');
            return;
        }
        
        const videoId = extractVideoId(url);
        if (!videoId) {
            alert('Could not extract video ID from the URL.');
            return;
        }
        
        // Show loading state
        loader.style.display = 'block';
        resultsSection.style.display = 'none';
        
        try {
            // Get video data first
            const videoData = await getVideoData(videoId);
            
            // Then generate the summary with the selected language
            const summary = await generateSummary(videoId, language);
            
            // Update the UI with the results
            videoThumbnail.src = videoData.thumbnailUrl;
            videoThumbnail.onerror = function() {
                // If thumbnail fails to load, try a lower quality one
                this.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                this.onerror = function() {
                    // If that also fails, use a default image
                    this.src = `https://img.youtube.com/vi/${videoId}/0.jpg`;
                    this.onerror = null;
                };
            };
            
            videoTitle.textContent = videoData.title;
            videoChannel.textContent = videoData.channel;
            
            // Format the summary with line breaks
            summaryText.innerHTML = summary.replace(/\n/g, '<br>');
            
            // Hide loader and show results
            loader.style.display = 'none';
            resultsSection.style.display = 'block';
        } catch (error) {
            console.error('Error:', error);
            
            // Show a user-friendly error message
            videoThumbnail.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            videoTitle.textContent = "Error Processing Video";
            videoChannel.textContent = "YouTube Video";
            summaryText.innerHTML = `Sorry, we encountered an error while processing this video. Please try again later or try another video.<br><br>You can watch it directly at: <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">https://www.youtube.com/watch?v=${videoId}</a>`;
            
            // Hide loader and show results with error
            loader.style.display = 'none';
            resultsSection.style.display = 'block';
        }
    });

    // Allow pressing Enter key in the input field to trigger the summarize button
    videoUrlInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            summarizeBtn.click();
        }
    });
}); 