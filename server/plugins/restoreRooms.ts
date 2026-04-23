import { restoreRoomsFromDB } from '../utils/gameRooms'

export default defineNitroPlugin(async () => {
  await restoreRoomsFromDB()
})
