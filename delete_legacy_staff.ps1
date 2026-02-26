$token = (gcloud auth print-access-token)
$legacyIds = @(
    "GoOx48iYkLnrWYH6rqS0",
    "NNXr00JLzXpXB33yMi90",
    "QDBwP8QxOOOy0iGMYULg",
    "cxUbs8YNDhOkKbVm7XOt",
    "mt1njcihhf7uzwhTpJE0",
    "riPgwQYr02udp4Gi8zVJ"
)

foreach ($id in $legacyIds) {
    $url = "https://firestore.googleapis.com/v1/projects/roti-naan-wala/databases/(default)/documents/staff/$($id)"
    try {
        Invoke-RestMethod -Method Delete -Uri $url -Headers @{Authorization = "Bearer $token" }
        Write-Host "Deleted legacy staff member: $($id)"
    }
    catch {
        Write-Error "Failed to delete $($id): $_"
    }
}
