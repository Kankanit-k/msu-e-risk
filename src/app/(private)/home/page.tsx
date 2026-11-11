'use client'

import { Box, Container, Card, CardContent, Typography, Divider, Chip } from '@mui/material'
import Grid from '@mui/material/Grid'

import { useAuthUser } from '@/hooks/AuthHooks'

export default function DashboardPage() {

    const { user, isAuthenticated } = useAuthUser()

    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Dashboard
                </Typography>
                
                {isAuthenticated && user ? (
                    <Card>
                        <CardContent>
                            <Typography variant="h5" gutterBottom>
                                Profile Information
                            </Typography>
                            <Divider sx={{ mb: 3 }} />
                            
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Staff ID
                                    </Typography>
                                    <Typography variant="body1" gutterBottom>
                                        {user.STAFFID}
                                    </Typography>
                                </Grid>
                                
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Full Name
                                    </Typography>
                                    <Typography variant="body1" gutterBottom>
                                        {user.PREFIXFULLNAME} {user.STAFFNAME} {user.STAFFSURNAME}
                                    </Typography>
                                </Grid>
                                
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Email
                                    </Typography>
                                    <Typography variant="body1" gutterBottom>
                                        {user.STAFFEMAIL1}
                                    </Typography>
                                </Grid>
                                
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Position
                                    </Typography>
                                    <Typography variant="body1" gutterBottom>
                                        {user.POSITIONNAME}
                                    </Typography>
                                </Grid>
                                
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Position Type
                                    </Typography>
                                    <Box sx={{ mt: 1 }}>
                                        <Chip label={user.POSTYPENAME} size="small" color="primary" />
                                    </Box>
                                </Grid>
                                
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Group Type
                                    </Typography>
                                    <Box sx={{ mt: 1 }}>
                                        <Chip label={user.GROUPTYPENAME} size="small" color="secondary" />
                                    </Box>
                                </Grid>
                                
                                {user.SCOPES && (
                                    <>
                                        <Grid size={{ xs: 12 }}>
                                            <Divider sx={{ my: 2 }} />
                                            <Typography variant="h6" gutterBottom>
                                                Department Information
                                            </Typography>
                                        </Grid>
                                        
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Department
                                            </Typography>
                                            <Typography variant="body1" gutterBottom>
                                                {user.SCOPES.staffdepartmentname}
                                            </Typography>
                                        </Grid>
                                        
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Department Code
                                            </Typography>
                                            <Typography variant="body1" gutterBottom>
                                                {user.SCOPES.staffdepartment}
                                            </Typography>
                                        </Grid>
                                        
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Program Code
                                            </Typography>
                                            <Typography variant="body1" gutterBottom>
                                                {user.SCOPES.progcode}
                                            </Typography>
                                        </Grid>
                                        
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Group ID
                                            </Typography>
                                            <Typography variant="body1" gutterBottom>
                                                {user.SCOPES.groupid}
                                            </Typography>
                                        </Grid>
                                    </>
                                )}
                            </Grid>
                        </CardContent>
                    </Card>
                ) : (
                    <Typography variant="body1">
                        Please log in to view your profile information.
                    </Typography>
                )}
            </Box>
        </Container>
    )
}
