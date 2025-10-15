import React, { useState, useCallback } from 'react';
import { Camera, Download, Image as ImageIcon, Loader2 } from 'lucide-react'; 

// API Key (will be automatically provided if empty in the Canvas environment)
const apiKey = "AIzaSyDIOhoO-fprn6kK4VTCjkDBsHlUDb3rGjc";
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;

// --- Utility Functions ---

/**
 * Converts a File object to a base64 data URL string.
 */
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

/**
 * Exponential backoff utility for retries.
 */
const fetchWithRetry = async (url, options, maxRetries = 5) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            if (i === maxRetries - 1 || error.message.includes('400')) {
                throw error;
            }
            const delay = Math.pow(2, i) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

// --- Main React Component ---

const App = () => {
    // State Management
    const [base64Image, setBase64Image] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
    const [outputImageUrl, setOutputImageUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null); // { text: string, type: 'error' | 'info' }

    /**
     * Handles file selection, updates the preview, and generates the base64 string.
     */
    const handleImageUpload = useCallback(async (event) => {
        setMessage(null);
        setOutputImageUrl(null);
        
        const file = event.target.files[0];
        if (!file) {
            setImagePreviewUrl(null);
            setBase64Image(null);
            return;
        }

        try {
            // Display the preview
            setImagePreviewUrl(URL.createObjectURL(file));

            // Convert file to base64 for API use
            const dataUrl = await fileToBase64(file);
            // Extract just the base64 data part (after the comma)
            const dataPart = dataUrl.split(',')[1];
            setBase64Image(dataPart);

        } catch (error) {
            setMessage({ text: 'Error reading file: ' + error.message, type: 'error' });
            setImagePreviewUrl(null);
            setBase64Image(null);
        }
    }, []);

    /**
     * Calls the Gemini API to perform the cartoon conversion.
     */
    const convertToCartoon = useCallback(async () => {
        if (!base64Image) {
            setMessage({ text: 'Please upload an image first.', type: 'error' });
            return;
        }

        // Reset state and show loading
        setOutputImageUrl(null);
        setMessage(null);
        setIsLoading(true);

        const userPrompt = "Convert this uploaded photo into a vibrant, high-quality cartoon style, specifically using a stylized, cinematic animation aesthetic. Ensure bright colors and crisp outlines.";

        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: userPrompt },
                        {
                            inlineData: {
                                mimeType: "image/png",
                                data: base64Image
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                responseModalities: ['TEXT', 'IMAGE']
            },
        };

        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        };

        try {
            const response = await fetchWithRetry(apiUrl, options);
            const result = await response.json();

            const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

            if (!base64Data) {
                const errorMessage = result.error?.message || "Generation failed: Could not retrieve image data from the model.";
                setMessage({ text: errorMessage, type: 'error' });
                return;
            }

            const imageUrl = `data:image/png;base64,${base64Data}`;
            setOutputImageUrl(imageUrl);
            setMessage({ text: 'Cartoon generated successfully!', type: 'info' });

        } catch (error) {
            console.error('API Error:', error);
            let errorMessage = 'An unknown error occurred during API call.';
            if (error.message.includes('400')) {
                 errorMessage = "API Error (400): Bad request. Ensure your input image is valid.";
            } else if (error.message.includes('HTTP')) {
                errorMessage = `API Error: ${error.message}.`;
            }
            setMessage({ text: errorMessage, type: 'error' });

        } finally {
            setIsLoading(false);
        }
    }, [base64Image]);

    // Tailwind classes for message box based on message type
    const getMessageClasses = (type) => {
        if (type === 'error') {
            return 'bg-red-100 text-red-800 border-l-4 border-red-500 font-medium';
        }
        return 'bg-green-100 text-green-800 border-l-4 border-green-500 font-medium';
    };

    return (
        <div className="min-h-screen w-full p-4 flex items-start justify-center bg-gray-50">
            <div className="w-full max-w-lg p-6 rounded-2xl bg-white shadow-2xl">
                
                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
                        <Camera className="w-8 h-8 mr-2 text-indigo-600"/> Cartoonizer Mobile
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">Transform your photo using AI image generation.</p>
                </header>

                {/* Status Message Box */}
                {message && (
                    <div className={`p-4 rounded-md text-sm mb-6 transition-all duration-300 ${getMessageClasses(message.type)}`}>
                        {message.text}
                    </div>
                )}

                {/* 1. Input Section */}
                <section className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3">1. Select Photo</h2>
                    <label htmlFor="imageInput" className="block w-full cursor-pointer">
                        <div className="w-full py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl shadow-md shadow-indigo-300 transition duration-150 ease-in-out hover:bg-indigo-700 flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 mr-2" />
                            {imagePreviewUrl ? 'Change Photo' : 'Browse or Tap to Upload'}
                        </div>
                        <input
                            type="file"
                            id="imageInput"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                    </label>
                    
                    {/* Image Preview */}
                    <div className="mt-4 border-2 border-dashed border-gray-300 rounded-xl h-48 flex items-center justify-center bg-white overflow-hidden">
                        {imagePreviewUrl ? (
                            <img src={imagePreviewUrl} alt="Input Preview" className="max-h-full max-w-full object-contain" />
                        ) : (
                            <span className="text-gray-400 text-sm">Input preview...</span>
                        )}
                    </div>
                </section>

                {/* 2. Conversion Button */}
                <button
                    onClick={convertToCartoon}
                    disabled={!base64Image || isLoading}
                    className="w-full py-4 px-4 bg-indigo-500 text-white font-extrabold rounded-xl shadow-lg shadow-indigo-400/50 transition duration-150 ease-in-out hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                            Processing Image...
                        </>
                    ) : (
                        '2. Convert to Cartoon'
                    )}
                </button>

                {/* 3. Output Section */}
                <section className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3">3. Cartoon Result</h2>
                    <div className="relative border-2 border-gray-300 rounded-xl h-64 flex items-center justify-center bg-white overflow-hidden">
                        {outputImageUrl ? (
                            <img src={outputImageUrl} alt="Cartoon Output" className="max-h-full max-w-full object-contain" />
                        ) : (
                            <span className="text-gray-400 text-sm">Output will appear here.</span>
                        )}
                        {/* Download button overlay */}
                        {outputImageUrl && (
                            <a href={outputImageUrl} download="cartoon-image.png" className="absolute bottom-3 right-3 p-3 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-colors duration-150" title="Download Image">
                                <Download className="w-5 h-5" />
                            </a>
                        )}
                    </div>
                </section>

                <footer className="mt-8 text-xs text-gray-400 text-center pt-4 border-t border-gray-100">
                    Powered by Gemini 2.5 Flash Image Preview (Banana Model)
                </footer>
            </div>
        </div>
    );
};

export default App;
