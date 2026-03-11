const prisma = require('../config/prisma');
const { ensureCollectionLocationColumns } = require('../utils/db-capabilities');

async function getTrackStaffDetails(req, res, next) {
  try {
    await ensureCollectionLocationColumns();

    const staff = await prisma.staffProfile.findUnique({ where: { id: req.params.staffId } });
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found.' });
    }

    const staffMobiles = [...new Set([staff.mobileNumber, staff.whatsappNumber].filter(Boolean))];

    const user = await prisma.user.findFirst({
      where: {
        role: 'SERVICE_STAFF',
        mobile: {
          in: staffMobiles.length ? staffMobiles : ['__NO_MATCH__']
        }
      },
      select: { id: true, name: true, mobile: true }
    });

    if (!user) {
      return res.json({
        staff: {
          id: staff.id,
          name: staff.name,
          vehicleNumber: staff.vehicleNumber,
          clusterName: staff.clustersAllotted
        },
        lastCollection: null,
        mapPoints: null
      });
    }

    const lastCollection = await prisma.collection.findFirst({
      where: {
        collectorId: user.id,
        collected: true
      },
      orderBy: [{ collectionDate: 'desc' }, { updatedAt: 'desc' }],
      include: {
        shop: {
          select: {
            id: true,
            shopName: true,
            ownerName: true,
            clusterName: true,
            address: true,
            latitude: true,
            longitude: true
          }
        }
      }
    });

    const payload = {
      staff: {
        id: staff.id,
        name: staff.name,
        vehicleNumber: staff.vehicleNumber,
        clusterName: staff.clustersAllotted
      },
      lastCollection: lastCollection
        ? {
          id: lastCollection.id,
          collectionDate: lastCollection.collectionDate,
          hairWeight: lastCollection.hairWeight,
          amount: lastCollection.amount,
          shop: lastCollection.shop
            ? {
              id: lastCollection.shop.id,
              shopName: lastCollection.shop.shopName,
              ownerName: lastCollection.shop.ownerName,
              clusterName: lastCollection.shop.clusterName,
              address: lastCollection.shop.address,
              latitude: lastCollection.shop.latitude,
              longitude: lastCollection.shop.longitude
            }
            : null,
          staffLocation: {
            latitude: lastCollection.staffLatitude,
            longitude: lastCollection.staffLongitude
          }
        }
        : null,
      mapPoints: lastCollection
        ? {
          staff: (lastCollection.staffLatitude != null && lastCollection.staffLongitude != null)
            ? {
              latitude: lastCollection.staffLatitude,
              longitude: lastCollection.staffLongitude
            }
            : null,
          shop: lastCollection.shop
            ? {
              latitude: lastCollection.shop.latitude,
              longitude: lastCollection.shop.longitude,
              shopName: lastCollection.shop.shopName,
              clusterName: lastCollection.shop.clusterName
            }
            : null
        }
        : null
    };

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getTrackStaffDetails
};
