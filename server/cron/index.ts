export default defineCronHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig(event);
  const { cronSecret } = runtimeConfig;

  if (!cronSecret) {
    console.error('CRON_SECRET is not defined. Aborting cron job.');
    return;
  }

  // Get the base URL of the deployed application
  const url = new URL(event.request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const pollUrl = `${baseUrl}/api/cron/poll-sources`;

  try {
    const response = await fetch(pollUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error polling sources: ${response.status} ${response.statusText}`, errorText);
    } else {
      console.log('Successfully triggered source poll.');
      const result = await response.json();
      console.log('Poll result:', result);
    }
  } catch (error) {
    console.error('Failed to trigger source poll:', error);
  }
});
