import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function Home() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  if (session.role === 'field_executive') {
    redirect('/field-executive')
  }

  if (session.role === 'officer_backoffice') {
    redirect('/backoffice')
  }

  if (session.role === 'scientist') {
    redirect('/scientist')
  }

  if (session.role === 'accountant') {
    redirect('/accountant/funds')
  }

  redirect('/dashboard')
}
