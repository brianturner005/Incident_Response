import { useEffect, useState } from 'react'
import { Save, CheckCircle, XCircle, Loader } from 'lucide-react'
import { api } from '../api'

const CONFIG_FIELDS = [
  { key: 'slack_webhook_url', label: 'Slack Webhook URL', placeholder: 'https://hooks.slack.com/services/...', section: 'Slack' },
  { key: 'default_slack_channel', label: 'Default Channel', placeholder: '#incidents', section: 'Slack' },
  { key: 'jira_base_url', label: 'Jira Base URL', placeholder: 'https://yourorg.atlassian.net', section: 'Jira' },
  { key: 'jira_email', label: 'Jira Email', placeholder: 'you@yourorg.com', section: 'Jira' },
  { key: 'jira_api_token', label: 'Jira API Token', placeholder: '••••••••', section: 'Jira', sensitive: true },
  { key: 'jira_project_key', label: 'Project Key', placeholder: 'IT', section: 'Jira' },
]

type TestStatus = 'idle' | 'loading' | 'ok' | 'error'

export function Settings() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [slackTest, setSlackTest] = useState<{ status: TestStatus; error?: string }>({ status: 'idle' })
  const [jiraTest, setJiraTest] = useState<{ status: TestStatus; error?: string }>({ status: 'idle' })

  useEffect(() => {
    api.config.get().then(setConfig).catch(console.error)
  }, [])

  async function handleSave() {
    await api.config.update(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function testSlack() {
    setSlackTest({ status: 'loading' })
    const result = await api.config.testSlack()
    setSlackTest({ status: result.success ? 'ok' : 'error', error: result.error })
  }

  async function testJira() {
    setJiraTest({ status: 'loading' })
    const result = await api.config.testJira()
    setJiraTest({ status: result.success ? 'ok' : 'error', error: result.error })
  }

  const sections = ['Slack', 'Jira']

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Save size={14} />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {sections.map(section => (
        <div key={section} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">{section} Integration</h2>
            {section === 'Slack' && (
              <TestButton status={slackTest.status} onTest={testSlack} error={slackTest.error} />
            )}
            {section === 'Jira' && (
              <TestButton status={jiraTest.status} onTest={testJira} error={jiraTest.error} />
            )}
          </div>

          {CONFIG_FIELDS.filter(f => f.section === section).map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              <input
                type={field.sensitive ? 'password' : 'text'}
                value={config[field.key] ?? ''}
                onChange={e => setConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      ))}

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Inbound Webhook</h2>
        <p className="text-xs text-gray-500 mb-2">
          Send external alerts (from monitoring tools, scripts, other systems) to this endpoint to automatically create incidents.
        </p>
        <code className="block bg-white border border-gray-200 rounded px-3 py-2 text-xs font-mono text-gray-700">
          POST /api/webhooks/inbound
        </code>
        <pre className="mt-2 bg-white border border-gray-200 rounded px-3 py-2 text-xs font-mono text-gray-600 overflow-auto">
{`{
  "title": "Alert: high error rate",
  "description": "Error rate > 5% on /api/checkout",
  "severity": "P2",
  "source": "Datadog",
  "tags": ["checkout", "api"]
}`}
        </pre>
      </div>
    </div>
  )
}

function TestButton({ status, onTest, error }: { status: TestStatus; onTest: () => void; error?: string }) {
  return (
    <div className="flex items-center gap-2">
      {status === 'ok' && <CheckCircle size={14} className="text-green-500" />}
      {status === 'error' && (
        <span className="flex items-center gap-1 text-xs text-red-500">
          <XCircle size={14} /> {error ?? 'Failed'}
        </span>
      )}
      <button
        onClick={onTest}
        disabled={status === 'loading'}
        className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:border-gray-400 disabled:opacity-50 transition-colors flex items-center gap-1"
      >
        {status === 'loading' && <Loader size={12} className="animate-spin" />}
        Test Connection
      </button>
    </div>
  )
}
