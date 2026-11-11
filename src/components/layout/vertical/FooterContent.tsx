'use client'

// Third-party Imports
import classnames from 'classnames'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

const FooterContent = () => {
  return (
    <div className={classnames(verticalLayoutClasses.footerContent, 'flex items-center justify-center')}>
      <p className='text-textSecondary'>{`© ${new Date().getFullYear()} มหาวิทยาลัยมหาสารคาม`}</p>
    </div>
  )
}

export default FooterContent
