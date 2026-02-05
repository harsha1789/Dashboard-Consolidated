/**
 * AI-Powered Security Analysis Service
 * Uses OpenRouter API for intelligent threat analysis and code review
 */

const https = require('https');

class AISecurityService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.baseUrl = 'openrouter.ai';
        this.model = 'anthropic/claude-3.5-sonnet'; // or 'openai/gpt-4-turbo'
    }

    /**
     * Check if API key is configured
     */
    isConfigured() {
        return !!this.apiKey && this.apiKey.startsWith('sk-or-');
    }

    /**
     * Make a request to OpenRouter API
     */
    async makeRequest(messages, maxTokens = 2000) {
        if (!this.isConfigured()) {
            throw new Error('OpenRouter API key not configured');
        }

        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                model: this.model,
                messages: messages,
                max_tokens: maxTokens,
                temperature: 0.3
            });

            const options = {
                hostname: this.baseUrl,
                port: 443,
                path: '/api/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': 'http://localhost:3001',
                    'X-Title': 'Automation Dashboard Security Testing'
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseData);
                        if (parsed.error) {
                            reject(new Error(parsed.error.message || 'API error'));
                        } else {
                            resolve(parsed);
                        }
                    } catch (e) {
                        reject(new Error('Failed to parse API response'));
                    }
                });
            });

            req.on('error', (e) => {
                reject(e);
            });

            req.write(data);
            req.end();
        });
    }

    /**
     * Analyze code for security vulnerabilities using AI
     */
    async analyzeCode(code, language = 'javascript') {
        const systemPrompt = `You are a security expert performing a thorough code security review.
Analyze the provided code for security vulnerabilities following OWASP guidelines.

For each vulnerability found, provide:
1. Title
2. Severity (critical, high, medium, low)
3. CWE ID
4. OWASP category
5. Description
6. Line number(s) affected
7. Specific remediation steps

Respond ONLY with valid JSON in this format:
{
    "findings": [
        {
            "title": "Vulnerability name",
            "severity": "high",
            "cwe": "CWE-XXX",
            "owasp": "A0X:2021 - Category Name",
            "description": "Detailed description",
            "line": 10,
            "recommendation": "How to fix"
        }
    ],
    "summary": {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "total": 0
    },
    "overallRisk": "high/medium/low",
    "securityScore": 75
}`;

        const userPrompt = `Analyze this ${language} code for security vulnerabilities:

\`\`\`${language}
${code}
\`\`\``;

        try {
            const response = await this.makeRequest([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]);

            const content = response.choices[0]?.message?.content || '';

            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return { findings: [], summary: { total: 0 }, error: 'Failed to parse AI response' };
        } catch (error) {
            console.error('AI analysis error:', error);
            throw error;
        }
    }

    /**
     * Generate threat model for an application
     */
    async generateThreatModel(description, architecture = null) {
        const systemPrompt = `You are a security architect performing threat modeling using STRIDE methodology.

Based on the application description, identify potential threats in each STRIDE category:
- Spoofing (identity)
- Tampering (data integrity)
- Repudiation (accountability)
- Information Disclosure (confidentiality)
- Denial of Service (availability)
- Elevation of Privilege (authorization)

Respond ONLY with valid JSON in this format:
{
    "threats": [
        {
            "id": "THREAT-001",
            "name": "Threat name",
            "category": "Spoofing",
            "severity": "high",
            "description": "Detailed description",
            "impact": "Business impact",
            "likelihood": "high/medium/low",
            "asset": "Affected component",
            "mitigations": ["mitigation 1", "mitigation 2"]
        }
    ],
    "summary": {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0
    },
    "recommendations": ["Top recommendation 1", "Top recommendation 2"]
}`;

        const userPrompt = `Generate a threat model for this application:

${description}

${architecture ? `Architecture:\n${architecture}` : ''}`;

        try {
            const response = await this.makeRequest([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], 3000);

            const content = response.choices[0]?.message?.content || '';

            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return { threats: [], error: 'Failed to parse AI response' };
        } catch (error) {
            console.error('Threat model error:', error);
            throw error;
        }
    }

    /**
     * Analyze API for security issues
     */
    async analyzeAPI(apiSpec) {
        const systemPrompt = `You are an API security expert. Analyze the API specification for security issues including:
- Authentication weaknesses
- Authorization flaws
- Input validation issues
- Rate limiting concerns
- Data exposure risks
- OWASP API Security Top 10

Respond with JSON containing findings and recommendations.`;

        try {
            const response = await this.makeRequest([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Analyze this API: ${JSON.stringify(apiSpec)}` }
            ]);

            const content = response.choices[0]?.message?.content || '';
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return { findings: [] };
        } catch (error) {
            console.error('API analysis error:', error);
            throw error;
        }
    }

    /**
     * Get security recommendations for findings
     */
    async getRemediationAdvice(finding) {
        const systemPrompt = `You are a security remediation expert. Provide detailed, actionable remediation steps for the security vulnerability described.

Include:
1. Step-by-step fix instructions
2. Code examples (if applicable)
3. Testing recommendations
4. Additional security hardening tips

Be specific and practical.`;

        try {
            const response = await this.makeRequest([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Provide remediation for: ${JSON.stringify(finding)}` }
            ], 1500);

            return {
                advice: response.choices[0]?.message?.content || 'No advice available'
            };
        } catch (error) {
            console.error('Remediation advice error:', error);
            throw error;
        }
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            configured: this.isConfigured(),
            model: this.model,
            features: ['codeAnalysis', 'threatModeling', 'apiAnalysis', 'remediation']
        };
    }
}

// Export singleton
const aiSecurityService = new AISecurityService();
module.exports = aiSecurityService;
module.exports.AISecurityService = AISecurityService;
