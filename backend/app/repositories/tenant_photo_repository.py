import uuid

from app.models.tenant_photo import TenantPhoto
from app.repositories.base import TenantScopedRepository


class TenantPhotoRepository(TenantScopedRepository[TenantPhoto]):
    model = TenantPhoto

    def list_ordered(self) -> list[TenantPhoto]:
        return sorted(self.list_all(), key=lambda photo: photo.position)

    def delete_by_id(self, photo_id: uuid.UUID) -> bool:
        photo = self.get_by_id(photo_id)
        if photo is None:
            return False
        self.delete(photo)
        return True
