$token = (gcloud auth print-access-token)
$staff = @(
    @{id='RTW101'; name='Alice Smith'; role='manager'; pin='1111'; staffCode='RTW101'; isActive=$true},
    @{id='RTW102'; name='Bob Johnson'; role='kitchen'; pin='2222'; staffCode='RTW102'; isActive=$true},
    @{id='RTW103'; name='Charlie Brown'; role='counter'; pin='3333'; staffCode='RTW103'; isActive=$true},
    @{id='RTW104'; name='David Lee'; role='driver'; pin='4444'; staffCode='RTW104'; isActive=$true},
    @{id='RTW105'; name='Emma Watson'; role='kitchen'; pin='5555'; staffCode='RTW105'; isActive=$true},
    @{id='RTW106'; name='Fiona Gallagher'; role='counter'; pin='6666'; staffCode='RTW106'; isActive=$true},
    @{id='RTW107'; name='George Clooney'; role='driver'; pin='7777'; staffCode='RTW107'; isActive=$true},
    @{id='RTW108'; name='Hannah Montana'; role='kitchen'; pin='8888'; staffCode='RTW108'; isActive=$true}
)

foreach ($s in $staff) {
    # Use Patch to create or overwrite. 
    # documents/staff/ID
    $url = "https://firestore.googleapis.com/v1/projects/roti-naan-wala/databases/(default)/documents/staff/$($s.id)"
    
    $body = @{
        fields = @{
            name = @{stringValue = $s.name}
            role = @{stringValue = $s.role}
            pin = @{stringValue = $s.pin}
            staffCode = @{stringValue = $s.staffCode}
            isActive = @{booleanValue = $s.isActive}
        }
    } | ConvertTo-Json -Depth 10
    
    try {
        Invoke-RestMethod -Method Patch -Uri $url -Headers @{Authorization = "Bearer $token"} -Body $body -ContentType "application/json"
        Write-Host "Successfully seeded $($s.name)"
    } catch {
        Write-Error "Failed to seed $($s.name): $_"
    }
}
