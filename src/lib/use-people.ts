import { useAuth, useUserLookup } from 'deepspace'

export interface Person {
  id: string
  /** "You" for the signed-in user, otherwise their display name. */
  label: string
  /** The real display name (used for search). */
  name: string
  imageUrl?: string
  isMe: boolean
}

/**
 * Resolves user ids to display info. The roster (`useUserLookup`) gives every
 * signed-in member the public identity (name + avatar) of other members — never
 * their email — so it is safe to show in the community.
 */
export function usePeople() {
  const { userId } = useAuth()
  const { getUser } = useUserLookup()
  return (id: string): Person => {
    const user = getUser(id)
    const name = user?.name?.trim() || 'Builder'
    const isMe = id === userId
    return { id, label: isMe ? 'You' : name, name, imageUrl: user?.imageUrl, isMe }
  }
}
