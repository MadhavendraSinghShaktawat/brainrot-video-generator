import { openai, StoryIdea, IdeaGenerationRequest } from '@/lib/openai';

export class IdeaGeneratorService {
  private static readonly VIRAL_ANALYSIS_PROMPT = `
Analyze these viral Reddit story examples that have generated millions of views:

EXAMPLE 1: "What made you go on your villain arc?"
- Story about father's revenge after son's suicide due to false accusations
- 5.3M likes, 90M views
- Elements: Justice, revenge, family tragedy, corruption, moral ambiguity

EXAMPLE 2: "Golden Child sister tried to kill me at my wedding"
- Story about sister poisoning bride with lemon allergy at wedding
- 5M likes, 78M views  
- Elements: Family rivalry, attempted murder, wedding drama, sibling jealousy

EXAMPLE 3: "School illegally changed lunch time"
- Story about principal reducing lunch to 15 minutes illegally
- 5.4M likes, 73M views
- Elements: Authority abuse, student rights, legal violations, collective action

EXAMPLE 4: "I offered to let my mom live under exact same rules"
- Story about reversing childhood abuse rules on abusive mother
- 5.8M likes, 68M views
- Elements: Revenge, role reversal, childhood trauma, poetic justice

EXAMPLE 5: "Told my brother ran away but he was murdered"
- Story about discovering father killed older brother years ago
- 4.2M likes, 56M views
- Elements: Family secrets, murder mystery, childhood deception, justice

VIRAL PATTERN ANALYSIS:
1. EMOTIONAL HOOKS: Betrayal, injustice, revenge, family drama
2. MORAL COMPLEXITY: Protagonist isn't always "good" - makes questionable choices
3. SATISFYING RESOLUTION: Bad people get consequences, justice served
4. RELATABLE THEMES: Family dysfunction, authority abuse, standing up for yourself
5. SHOCK VALUE: Unexpected twists, extreme situations, dark revelations
6. FIRST-PERSON NARRATIVE: Personal, intimate storytelling style
7. CLIFFHANGER ELEMENTS: Stories that make you want to know "what happened next"
`;

  private static readonly IDEA_GENERATION_PROMPT = `
Based on the viral story analysis above, generate {count} completely NEW and original story ideas that follow these proven viral patterns. Each story should be:

1. EMOTIONALLY GRIPPING: Strong emotional hooks that trigger immediate engagement
2. MORALLY COMPLEX: Situations where right/wrong isn't black and white
3. RELATABLE: Universal themes people can connect with
4. SATISFYING: Clear resolution where justice/karma is served
5. SHOCKING: Unexpected twists that keep viewers engaged
6. AUTHENTIC: Written in natural, conversational first-person style

For each story idea, provide:
- Title: Compelling hook question or statement
- Hook: Opening line that grabs attention immediately  
- Story: 2-3 sentence summary of the full narrative arc
- Viral Factors: Specific elements that make this story shareable
- Estimated Views: Realistic projection based on similar content
- Emotional Triggers: Primary emotions this story evokes
- Target Audience: Demographics most likely to engage

IMPORTANT GUIDELINES:
- Stories must be original, not variations of the examples
- Include diverse themes: workplace, relationships, family, school, legal, etc.
- Mix different emotional tones: revenge, justice, standing up, exposing truth
- Ensure each story has a clear "villain" and satisfying consequence
- Make protagonists relatable but morally interesting
- Include specific, vivid details that make stories feel real
- End with resolution that feels justified and satisfying

Generate stories with {tone} tone, {length} length preference.

Return ONLY a valid JSON array of objects with this exact structure:
[
  {
    "title": "Story title here",
    "hook": "Opening hook line",
    "story": "2-3 sentence story summary",
    "viralFactors": ["factor1", "factor2", "factor3"],
    "estimatedViews": "X.XM views",
    "emotionalTriggers": ["emotion1", "emotion2"],
    "targetAudience": "audience description"
  }
]
`;

  static async generateIdeas(request: IdeaGenerationRequest): Promise<StoryIdea[]> {
    try {
      // Check if OpenAI is properly configured
      if (!process.env.OPENAI_KEY && !process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      console.log('🎯 Generating ideas with request:', request);
      
      const prompt = this.VIRAL_ANALYSIS_PROMPT + 
        this.IDEA_GENERATION_PROMPT
          .replace('{count}', request.count.toString())
          .replace('{tone}', request.tone || 'dramatic')
          .replace('{length}', request.length || 'medium');

      console.log('📝 Calling OpenAI API...');
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert viral content strategist who analyzes successful Reddit stories and generates ideas that are guaranteed to go viral. You understand psychology, storytelling, and what makes content shareable."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 4000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      console.log('📦 Raw OpenAI response:', response.substring(0, 200) + '...');

      // Clean up the response to ensure valid JSON
      const cleanedResponse = response
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '')
        .trim();

      console.log('🧹 Cleaned response:', cleanedResponse.substring(0, 200) + '...');

      try {
        const ideas: StoryIdea[] = JSON.parse(cleanedResponse);
        console.log('✅ Successfully parsed ideas:', ideas.length);
        return ideas;
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        console.error('📄 Raw response that failed to parse:', cleanedResponse);
        throw new Error(`Failed to parse OpenAI response: ${parseError}`);
      }
    } catch (error) {
      console.error('Error generating ideas:', error);
      throw new Error('Failed to generate story ideas. Please try again.');
    }
  }

  static async generateSingleIdea(theme?: string): Promise<StoryIdea> {
    const ideas = await this.generateIdeas({
      count: 1,
      themes: theme ? [theme] : undefined,
    });
    return ideas[0];
  }

  static getPopularThemes(): string[] {
    return [
      'Family Drama',
      'Workplace Revenge',
      'School/Education',
      'Relationship Betrayal',
      'Legal Justice',
      'Childhood Trauma',
      'Authority Abuse',
      'Sibling Rivalry',
      'Parental Issues',
      'Friendship Betrayal',
      'Academic Cheating',
      'Social Media Drama',
      'Neighborhood Disputes',
      'Service Industry',
      'Healthcare System',
      'Corporate Corruption',
      'Religious/Cultural',
      'Housing/Landlord',
      'Dating/Romance',
      'Financial Fraud'
    ];
  }
} 