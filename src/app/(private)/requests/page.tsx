import type { Metadata } from 'next'

import Requests from '@views/requests/Requests'

export const metadata: Metadata = { title: 'คำขอ' }

const RequestsPage = () => <Requests />

export default RequestsPage
