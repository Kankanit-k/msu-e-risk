import type { Metadata } from 'next'

import Connections from '@views/Connections'

export const metadata: Metadata = { title: 'การเชื่อมต่อของฉัน' }

const ConnectionsPage = () => <Connections />

export default ConnectionsPage
