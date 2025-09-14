USE DINHVIETTUNG;
GO

IF NOT EXISTS (SELECT 1 FROM Role WHERE RoleName = N'TruongCA')
    INSERT INTO Role(RoleName) VALUES (N'TruongCA');

DECLARE @roleId INT = (SELECT TOP 1 RoleID FROM Role WHERE RoleName = N'TruongCA');

IF EXISTS (SELECT 1 FROM UserAccount WHERE Username = N'admin')
    UPDATE UserAccount
    SET PasswordHash = N'admin123', FullName = N'Quản trị hệ thống', RoleID = @roleId
    WHERE Username = N'admin';
ELSE
    INSERT INTO UserAccount (Username, PasswordHash, FullName, RoleID)
    VALUES (N'admin', N'admin123', N'Quản trị hệ thống', @roleId);

SELECT Username, PasswordHash, RoleID
FROM UserAccount WHERE Username = N'admin';
