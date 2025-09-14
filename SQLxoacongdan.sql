USE DINHVIETTUNG;
GO

CREATE OR ALTER PROCEDURE usp_DeleteCitizenByNationalID
    @NationalID VARCHAR(12)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CitizenID INT;
    SELECT @CitizenID = CitizenID FROM Citizen WHERE NationalID = @NationalID;

    IF @CitizenID IS NULL
    BEGIN
        RAISERROR (N'Không tìm thấy công dân với CCCD này.', 16, 1);
        RETURN;
    END

    BEGIN TRY
        BEGIN TRAN;

        -- Đếm trước để trả về thống kê
        DECLARE @cntStatus   INT = (SELECT COUNT(*) FROM CitizenStatus           WHERE CitizenID = @CitizenID);
        DECLARE @cntMove     INT = (SELECT COUNT(*) FROM CitizenMovement         WHERE CitizenID = @CitizenID);
        DECLARE @cntTempReg  INT = (SELECT COUNT(*) FROM TemporaryRegistration   WHERE CitizenID = @CitizenID);
        DECLARE @cntResCert  INT = (SELECT COUNT(*) FROM ResidenceCertificate    WHERE CitizenID = @CitizenID);
        DECLARE @cntLicense  INT = (SELECT COUNT(*) FROM License                 WHERE CitizenID = @CitizenID);

        -- XÓA công dân (các bảng liên quan đã ON DELETE CASCADE / trigger xử lý HeadID)
        DELETE FROM Citizen WHERE CitizenID = @CitizenID;

        COMMIT;

        SELECT 
            1 AS Success,
            @CitizenID   AS CitizenID,
            @cntStatus   AS DeletedStatuses,
            @cntMove     AS DeletedMovements,
            @cntTempReg  AS DeletedTempRegs,
            @cntResCert  AS DeletedResCerts,
            @cntLicense  AS DeletedLicenses;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrSev INT = ERROR_SEVERITY();
        DECLARE @ErrState INT = ERROR_STATE();
        RAISERROR (@ErrMsg, @ErrSev, @ErrState);
    END CATCH
END
GO
