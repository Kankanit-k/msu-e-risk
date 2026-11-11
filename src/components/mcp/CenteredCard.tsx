// Narrow centered card used by the consent and confirm screens (blank layout).
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'

import type { ChildrenType } from '@core/types'

import Logo from '@components/layout/shared/Logo'

const CenteredCard = ({ children }: ChildrenType) => (
  <div className='flex justify-center p-4 sm:p-6'>
    <Card className='is-full max-is-[480px]'>
      <CardContent className='flex flex-col gap-5 p-6 sm:p-8'>
        <Logo />
        {children}
      </CardContent>
    </Card>
  </div>
)

export default CenteredCard
