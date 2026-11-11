'use client'

import { useEffect, useState } from 'react'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

type User = {
  id: number
  email: string
  name: string | null
  staffId: string | null
}

const UserListPage = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://localhost:3001'

    fetch(`${apiUrl}/api/users`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch users')
        
return res.json()
      })
      .then(data => {
        setUsers(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <Card>
      <CardHeader title='Backend User List' subheader='Fetching data from Node.js Express Backend' />
      <CardContent>
        {loading && <Typography>Loading users...</Typography>}
        {error && <Typography color='error'>Error: {error}</Typography>}
        {!loading && !error && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Staff ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.name || 'N/A'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.staffId || 'N/A'}</TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align='center'>
                      No users found. Try adding some via the backend API.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  )
}

export default UserListPage
