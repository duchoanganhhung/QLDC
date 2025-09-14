
USE DINHVIETTUNG;
GO


-- Create tables for Police Command Station system (Commune/Ward level)

CREATE TABLE Area (
    AreaID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Type NVARCHAR(50) NOT NULL  -- e.g. 'Thon' (thôn), 'To' (tổ dân phố)
);

CREATE TABLE Household (
    HouseholdID INT IDENTITY(1,1) PRIMARY KEY,
    Address NVARCHAR(255) NOT NULL,
    AreaID INT NOT NULL,
    HeadID INT NULL,  -- head of household, references Citizen
    CONSTRAINT FK_Household_Area FOREIGN KEY (AreaID) 
        REFERENCES Area(AreaID)
        ON UPDATE CASCADE ON DELETE NO ACTION
    -- FK to Citizen (HeadID) sẽ thêm sau khi có Citizen
);

CREATE TABLE Citizen (
    CitizenID INT IDENTITY(1,1) PRIMARY KEY,
    NationalID VARCHAR(12) UNIQUE,        -- National ID (CCCD/CMND)
    FullName NVARCHAR(100) NOT NULL,
    DateOfBirth DATE NULL,
    Gender NVARCHAR(10) NULL,
    HouseholdID INT NULL,                 -- permanent household (if resident)
    HasCriminalRecord BIT DEFAULT 0,      -- flag if has tien an/tien su
    CONSTRAINT FK_Citizen_Household FOREIGN KEY (HouseholdID) 
        REFERENCES Household(HouseholdID)
        ON UPDATE CASCADE ON DELETE SET NULL
);

-- FK HeadID: dùng NO ACTION để tránh multiple cascade path,
-- logic "xóa công dân thì HeadID về NULL" sẽ do trigger xử lý.
ALTER TABLE Household
    ADD CONSTRAINT FK_Household_Head FOREIGN KEY (HeadID) 
        REFERENCES Citizen(CitizenID)
        ON UPDATE NO ACTION ON DELETE NO ACTION;
GO

/* =========================
   Administrative procedures
   ========================= */

CREATE TABLE TemporaryRegistration (
    RegID INT IDENTITY(1,1) PRIMARY KEY,
    CitizenID INT NOT NULL,
    RegType NVARCHAR(20) NOT NULL,    -- 'TAM_TRU' or 'TAM_VANG'
    StartDate DATE NOT NULL,
    EndDate DATE NULL,
    Location NVARCHAR(255) NULL,      -- address of stay or destination
    Reason NVARCHAR(255) NULL,
    CONSTRAINT FK_TempReg_Citizen FOREIGN KEY (CitizenID) 
        REFERENCES Citizen(CitizenID)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE ResidenceCertificate (
    CertID INT IDENTITY(1,1) PRIMARY KEY,
    CitizenID INT NOT NULL,
    IssueDate DATE NOT NULL DEFAULT GETDATE(),
    Purpose NVARCHAR(255) NULL,       -- reason/purpose of issuance
    CONSTRAINT FK_ResCert_Citizen FOREIGN KEY (CitizenID) 
        REFERENCES Citizen(CitizenID)
        ON UPDATE CASCADE ON DELETE CASCADE
);

-- License management table (for business, weapon, fire safety licenses)
CREATE TABLE License (
    LicenseID INT IDENTITY(1,1) PRIMARY KEY,
    LicenseType NVARCHAR(20) NOT NULL,   -- 'BUSINESS', 'WEAPON', 'FIRE'
    CitizenID INT NULL,                 -- link if license for a person
    HouseholdID INT NULL,               -- link if license for a household
    BusinessID INT NULL,                -- link if license for a business
    LicenseNumber NVARCHAR(50) NULL,
    IssueDate DATE NOT NULL DEFAULT GETDATE(),
    ExpiryDate DATE NULL,
    Details NVARCHAR(255) NULL,         -- additional info (e.g. weapon type)
    CONSTRAINT FK_License_Citizen FOREIGN KEY (CitizenID) 
        REFERENCES Citizen(CitizenID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT FK_License_Household FOREIGN KEY (HouseholdID) 
		REFERENCES Household(HouseholdID)
		ON UPDATE NO ACTION
		ON DELETE NO ACTION,


    -- Business table chưa tạo; FK sẽ thêm sau
    CONSTRAINT CHK_License_Subject CHECK (
        (LicenseType = 'BUSINESS' AND BusinessID IS NOT NULL 
            AND CitizenID IS NULL AND HouseholdID IS NULL)
     OR (LicenseType = 'WEAPON'   AND CitizenID IS NOT NULL 
            AND BusinessID IS NULL AND HouseholdID IS NULL)
     OR (LicenseType = 'FIRE'     AND HouseholdID IS NOT NULL 
            AND CitizenID IS NULL AND BusinessID IS NULL)
    )
);

 /* =========================
    B. Public Security Management
    ========================= */

CREATE TABLE CitizenStatus (
    StatusID INT IDENTITY(1,1) PRIMARY KEY,
    CitizenID INT NOT NULL,
    StatusType NVARCHAR(20) NOT NULL,  -- e.g. 'TRUY_NA', 'QUAN_CHE', ...
    StartDate DATE NULL,
    EndDate DATE NULL,
    Notes NVARCHAR(255) NULL,
    CONSTRAINT FK_Status_Citizen FOREIGN KEY (CitizenID) 
        REFERENCES Citizen(CitizenID)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE CitizenMovement (
    MovementID INT IDENTITY(1,1) PRIMARY KEY,
    CitizenID INT NOT NULL,
    MoveDate DATETIME NOT NULL DEFAULT GETDATE(),
    MoveType NVARCHAR(20) NOT NULL,   -- 'DI' (leave) or 'DEN' (arrive)
    Location NVARCHAR(255) NULL,      -- destination or origin location
    Notes NVARCHAR(255) NULL,
    CONSTRAINT FK_Movement_Citizen FOREIGN KEY (CitizenID) 
        REFERENCES Citizen(CitizenID)
        ON UPDATE CASCADE ON DELETE CASCADE
);

/* =========================
   F. System Administration
   ========================= */

CREATE TABLE Role (
    RoleID INT IDENTITY(1,1) PRIMARY KEY,
    RoleName NVARCHAR(50) NOT NULL UNIQUE   -- e.g. 'TruongCA', 'CSKV'
);

CREATE TABLE UserAccount (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(100) NULL,
    RoleID INT NOT NULL,
    CONSTRAINT FK_User_Role FOREIGN KEY (RoleID) 
        REFERENCES Role(RoleID)
        ON UPDATE CASCADE ON DELETE NO ACTION
);

-- Seed default roles (an toàn khi chạy nhiều lần)
IF NOT EXISTS (SELECT 1 FROM Role WHERE RoleName = 'TruongCA')
    INSERT INTO Role (RoleName) VALUES ('TruongCA');
IF NOT EXISTS (SELECT 1 FROM Role WHERE RoleName = 'TrucBan')
    INSERT INTO Role (RoleName) VALUES ('TrucBan');
IF NOT EXISTS (SELECT 1 FROM Role WHERE RoleName = 'CSKV')
    INSERT INTO Role (RoleName) VALUES ('CSKV');
GO

/* =========================
   TRIGGERS (thay thế cascade HeadID)
   ========================= */

-- 1) Khi xóa công dân là chủ hộ -> HeadID về NULL
IF OBJECT_ID('trg_Citizen_Delete_Head','TR') IS NOT NULL
    DROP TRIGGER trg_Citizen_Delete_Head;
GO
CREATE TRIGGER trg_Citizen_Delete_Head
ON Citizen
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE h
        SET HeadID = NULL
    FROM Household h
    INNER JOIN deleted d ON h.HeadID = d.CitizenID;
END
GO

-- 2) Đảm bảo HeadID phải thuộc đúng Household (ràng buộc nghiệp vụ)
IF OBJECT_ID('trg_Household_Head_Validate','TR') IS NOT NULL
    DROP TRIGGER trg_Household_Head_Validate;
GO
CREATE TRIGGER trg_Household_Head_Validate
ON Household
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Nếu HeadID không NULL, kiểm tra công dân đó phải thuộc đúng Household
    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN Citizen c ON c.CitizenID = i.HeadID
        WHERE i.HeadID IS NOT NULL
          AND (c.HouseholdID IS NULL OR c.HouseholdID <> i.HouseholdID)
    )
    BEGIN
        RAISERROR (N'HeadID phải là công dân thuộc đúng Household.', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
END
GO

-- Khi xóa Household thì xóa License liên quan
IF OBJECT_ID('trg_Household_Delete','TR') IS NOT NULL
    DROP TRIGGER trg_Household_Delete;
GO
CREATE TRIGGER trg_Household_Delete
ON Household
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;
    DELETE l
    FROM License l
    INNER JOIN deleted d ON l.HouseholdID = d.HouseholdID;
END
GO

/* =========================
   SEED DỮ LIỆU MẪU: Area → Household → Citizen → Gán chủ hộ
   ========================= */
/* =========================================================
   1) INSERT/UPDATE CÔNG DÂN + GÁN CHỦ HỘ (tuỳ chọn)
   ========================================================= */
CREATE OR ALTER PROCEDURE usp_AddCitizenWithOptionalHead
    @NationalID         VARCHAR(12),
    @FullName           NVARCHAR(100),
    @DateOfBirth        DATE              = NULL,
    @Gender             NVARCHAR(10)      = NULL,   -- 'Nam'/'Nữ'/'Khác'
    @AreaName           NVARCHAR(100),              -- vd: N'Phú Bình 2, Cam Tân, Cam Lâm, Khánh Hòa'
    @AreaType           NVARCHAR(50),               -- vd: N'Thôn' hoặc N'Tổ'
    @HouseholdAddress   NVARCHAR(255),              -- vd: N'Thôn Phú Bình 2, Cam Tân, Cam Lâm, Khánh Hòa'
    @IsHead             BIT               = 0,      -- 1 = gán làm chủ hộ
    @HasCriminalRecord  BIT               = 0,      -- 1 = có tiền án/tiền sự
    @SetWanted          BIT               = 0,      -- 1 = gắn trạng thái TRUY_NA
    @SetQuanChe         BIT               = 0       -- 1 = gắn trạng thái QUAN_CHE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AreaID INT, @HouseholdID INT, @CitizenID INT;

    /* Đảm bảo Area tồn tại */
    IF NOT EXISTS (SELECT 1 FROM Area WHERE Name=@AreaName AND Type=@AreaType)
        INSERT INTO Area(Name, Type) VALUES (@AreaName, @AreaType);
    SELECT @AreaID = AreaID FROM Area WHERE Name=@AreaName AND Type=@AreaType;

    /* Đảm bảo Household tồn tại (theo Address + Area) */
    IF NOT EXISTS (SELECT 1 FROM Household WHERE Address=@HouseholdAddress AND AreaID=@AreaID)
        INSERT INTO Household(Address, AreaID, HeadID) VALUES (@HouseholdAddress, @AreaID, NULL);
    SELECT @HouseholdID = HouseholdID FROM Household WHERE Address=@HouseholdAddress AND AreaID=@AreaID;

    /* Insert hoặc Update Citizen theo NationalID (UNIQUE) */
    IF EXISTS (SELECT 1 FROM Citizen WHERE NationalID=@NationalID)
    BEGIN
        UPDATE Citizen
        SET FullName          = @FullName,
            DateOfBirth       = @DateOfBirth,
            Gender            = @Gender,
            HouseholdID       = @HouseholdID,
            HasCriminalRecord = @HasCriminalRecord
        WHERE NationalID = @NationalID;

        SELECT @CitizenID = CitizenID FROM Citizen WHERE NationalID=@NationalID;
    END
    ELSE
    BEGIN
        INSERT INTO Citizen (NationalID, FullName, DateOfBirth, Gender, HouseholdID, HasCriminalRecord)
        VALUES (@NationalID, @FullName, @DateOfBirth, @Gender, @HouseholdID, @HasCriminalRecord);
        SET @CitizenID = SCOPE_IDENTITY();
    END

    /* Nếu chọn làm chủ hộ → gán HeadID (trigger đã đảm bảo đúng hộ) */
    IF (@IsHead = 1)
    BEGIN
        UPDATE Household SET HeadID = @CitizenID WHERE HouseholdID = @HouseholdID;
    END

    /* Trạng thái: TRUY_NA / QUAN_CHE (chỉ thêm nếu chưa có bản ghi đang hiệu lực) */
    IF (@SetWanted = 1)
    BEGIN
        INSERT INTO CitizenStatus (CitizenID, StatusType, StartDate, EndDate, Notes)
        SELECT @CitizenID, N'TRUY_NA', CAST(GETDATE() AS date), NULL, N'Gắn từ usp_AddCitizenWithOptionalHead'
        WHERE NOT EXISTS (
            SELECT 1 FROM CitizenStatus 
            WHERE CitizenID=@CitizenID AND StatusType=N'TRUY_NA' AND (EndDate IS NULL OR EndDate >= GETDATE())
        );
    END

    IF (@SetQuanChe = 1)
    BEGIN
        INSERT INTO CitizenStatus (CitizenID, StatusType, StartDate, EndDate, Notes)
        SELECT @CitizenID, N'QUAN_CHE', CAST(GETDATE() AS date), NULL, N'Gắn từ usp_AddCitizenWithOptionalHead'
        WHERE NOT EXISTS (
            SELECT 1 FROM CitizenStatus 
            WHERE CitizenID=@CitizenID AND StatusType=N'QUAN_CHE' AND (EndDate IS NULL OR EndDate >= GETDATE())
        );
    END

    /* Trả về thông tin sau khi thêm/cập nhật */
    SELECT @CitizenID AS CitizenID, @HouseholdID AS HouseholdID, @AreaID AS AreaID;
END
GO

/* (khuyến nghị) Index cho tra cứu nhanh theo CCCD */
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_Citizen_NationalID' AND object_id = OBJECT_ID('Citizen')
)
    CREATE INDEX IX_Citizen_NationalID ON Citizen(NationalID);
GO

/* =========================================================
   2) TRA CỨU THEO CCCD (hiện cảnh báo Truy nã/Quản chế/tiền án)
   ========================================================= */
CREATE OR ALTER PROCEDURE usp_CitizenQuickSearch
    @NationalID VARCHAR(12)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        c.CitizenID,
        c.FullName,
        c.NationalID,
        c.DateOfBirth,
        c.Gender,
        h.HouseholdID,
        h.Address            AS HouseholdAddress,
        a.AreaID,
        a.Name               AS AreaName,
        a.Type               AS AreaType,
        CASE WHEN h.HeadID = c.CitizenID THEN 1 ELSE 0 END AS IsHeadOfHousehold,

        -- Tổng hợp trạng thái đang hiệu lực của công dân
        st.HasTruyNa,
        st.HasQuanChe,
        st.AllActiveStatuses,

        -- Cờ "tội phạm" (tiền án/tiền sự hoặc đang truy nã)
        CAST(CASE WHEN c.HasCriminalRecord = 1 OR st.HasTruyNa = 1 THEN 1 ELSE 0 END AS BIT) AS IsCriminal,

        -- Chuỗi cảnh báo ưu tiên
        CASE 
            WHEN st.HasTruyNa  = 1 THEN N'Truy nã'
            WHEN st.HasQuanChe = 1 THEN N'Quản chế'
            WHEN c.HasCriminalRecord = 1 THEN N'Có tiền án/tiền sự'
            ELSE NULL
        END AS AlertText
    FROM Citizen c
    LEFT JOIN Household h ON c.HouseholdID = h.HouseholdID
    LEFT JOIN Area a      ON h.AreaID = a.AreaID
    OUTER APPLY (
        SELECT 
            MAX(CASE WHEN s.StatusType = N'TRUY_NA'  AND (s.EndDate IS NULL OR s.EndDate >= GETDATE()) THEN 1 ELSE 0 END) AS HasTruyNa,
            MAX(CASE WHEN s.StatusType = N'QUAN_CHE' AND (s.EndDate IS NULL OR s.EndDate >= GETDATE()) THEN 1 ELSE 0 END) AS HasQuanChe,
            STRING_AGG(
                CASE WHEN (s.EndDate IS NULL OR s.EndDate >= GETDATE()) THEN s.StatusType END, 
                N', '
            ) AS AllActiveStatuses
        FROM CitizenStatus s
        WHERE s.CitizenID = c.CitizenID
    ) st
    WHERE c.NationalID = @NationalID;
END
GO

-- 1) Nhập chủ hộ (gán luôn làm chủ hộ + không có trạng thái)
EXEC usp_AddCitizenWithOptionalHead
    @NationalID='100000000001',
    @FullName=N'Nguyễn Văn A',
    @DateOfBirth='1980-01-01',
    @Gender=N'Nam',
    @AreaName=N'Phú Bình 2, Cam Tân, Cam Lâm, Khánh Hòa',
    @AreaType=N'Thôn',
    @HouseholdAddress=N'Thôn Phú Bình 2, Cam Tân, Cam Lâm, Khánh Hòa',
    @IsHead=1,
    @HasCriminalRecord=0,
    @SetWanted=0,
    @SetQuanChe=0;

-- 2) Nhập vợ (không phải chủ hộ, có tiền án/tiền sự)
EXEC usp_AddCitizenWithOptionalHead
    @NationalID='100000000002',
    @FullName=N'Trần Thị B',
    @DateOfBirth='1982-05-03',
    @Gender=N'Nữ',
    @AreaName=N'Phú Bình 2, Cam Tân, Cam Lâm, Khánh Hòa',
    @AreaType=N'Thôn',
    @HouseholdAddress=N'Thôn Phú Bình 2, Cam Tân, Cam Lâm, Khánh Hòa',
    @IsHead=0,
    @HasCriminalRecord=1,   -- có tiền án/tiền sự
    @SetWanted=0,
    @SetQuanChe=0;

-- 3) Nhập con (không phải chủ hộ, bị quản chế)
EXEC usp_AddCitizenWithOptionalHead
    @NationalID='100000000003',
    @FullName=N'Nguyễn Văn C',
    @DateOfBirth='2005-07-24',
    @Gender=N'Nam',
    @AreaName=N'Phú Bình 2, Cam Tân, Cam Lâm, Khánh Hòa',
    @AreaType=N'Thôn',
    @HouseholdAddress=N'Thôn Phú Bình 2, Cam Tân, Cam Lâm, Khánh Hòa',
    @IsHead=0,
    @HasCriminalRecord=0,
    @SetWanted=0,
    @SetQuanChe=1;          -- gắn trạng thái QUAN_CHE


EXEC usp_CitizenQuickSearch @NationalID='100000000001'; -- chủ hộ
EXEC usp_CitizenQuickSearch @NationalID='100000000002'; -- có tiền án/tiền sự
EXEC usp_CitizenQuickSearch @NationalID='100000000003'; -- đang "Quản chế"
