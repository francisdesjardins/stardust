import { connectDebugLog, createStore, produce } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Typography } from '@mui/material';
import { ExampleLayout } from '@/entities/example';

type Profile = {
  name: string;
  address: { city: string; zip: string };
  tags: string[];
};

const initial: Profile = {
  name: 'Alice',
  address: { city: 'Montréal', zip: 'H2X 1Y6' },
  tags: ['admin'],
};

const profileStore = createStore({ profile: initial }, ({ set, get }) => ({
  relocate(city: string, zip: string) {
    set({
      profile: produce(get().profile, (draft) => {
        draft.address.city = city;
        draft.address.zip = zip;
      }),
    });
  },
  addTag(tag: string) {
    set({
      profile: produce(get().profile, (draft) => {
        if (!draft.tags.includes(tag)) {
          draft.tags.push(tag);
        }
      }),
    });
  },
  reset() {
    set({ profile: initial });
  },
  
}));

connectDebugLog(profileStore, { name: 'profile' });

export function ProduceExample() {
  const { profile } = useStore(profileStore);

  return (
    <ExampleLayout result={`${profile.address.city} · [${profile.tags.join(', ')}]`}>
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          profileStore.relocate('Toronto', 'M5V 3A8');
        }}
      >
        Move → Toronto
      </Button>
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          profileStore.relocate('Vancouver', 'V6B 1S5');
        }}
      >
        Move → Vancouver
      </Button>
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          profileStore.addTag('editor');
        }}
      >
        Add "editor" tag
      </Button>
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          profileStore.addTag('viewer');
        }}
      >
        Add "viewer" tag
      </Button>
      <Button
        variant="outlined"
        size="small"
        color="error"
        onClick={() => {
          profileStore.reset();
        }}
      >
        Reset
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ width: '100%' }}>
        {profile.name} · {profile.address.city}, {profile.address.zip} · [{profile.tags.join(', ')}]
      </Typography>
    </ExampleLayout>
  );
}
