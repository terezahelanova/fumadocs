import { structure } from 'fumadocs-core/mdx-plugins/remark-structure';
import { NextRequest } from 'next/server';
import { parseFrontmatter } from '@fumadocs/mdx-remote';

export async function POST(request: NextRequest) {
  try {
    const { payload } = await request.json();
    const { frontmatter, content } = parseFrontmatter(payload);
    
    const result = structure(content, undefined, {
      types: () => true,
    });

    return new Response(
      JSON.stringify({ 
        structure: result,
        title : frontmatter.title || '',
        key: frontmatter.key || ''
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error parsing md:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate table of contents',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

  
