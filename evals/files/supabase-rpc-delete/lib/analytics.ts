import { PostHog } from 'posthog-node'

const ph = new PostHog(process.env.POSTHOG_KEY!, { host: process.env.POSTHOG_HOST })

// called server-side after login and after every enrollment
export function track(userId: string, email: string, event: string, props: Record<string, unknown> = {}) {
  ph.identify({ distinctId: userId, properties: { email } })
  ph.capture({ distinctId: userId, event, properties: props })
}
