const DISCORD_API_BASE = 'https://discord.com/api/v10';

interface DiscordMessage {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
  };
  timestamp: string;
}

export async function getNewDiscordMessages(token: string, channelId: string, after?: string): Promise<DiscordMessage[]> {
  const url = new URL(`${DISCORD_API_BASE}/channels/${channelId}/messages`);
  url.searchParams.set('limit', '100');
  if (after) {
    url.searchParams.set('after', after);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bot ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Error fetching Discord messages for channel ${channelId}: ${error}`);
    throw new Error(`Failed to fetch messages from Discord: ${response.statusText}`);
  }

  return response.json() as Promise<DiscordMessage[]>;
}
