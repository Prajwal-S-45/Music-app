import React, { memo, useCallback } from 'react';
import { Edit3, PlayCircle, Trash2 } from 'lucide-react';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

function PlaylistCard({ queue, onOpenQueue, onPlayAll, onRenameQueue, onDeleteQueue }) {
  const handleOpen = useCallback(() => {
    onOpenQueue?.(queue.id);
  }, [onOpenQueue, queue.id]);

  const handleActionsWrapperClick = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const handlePlayAll = useCallback(() => {
    onPlayAll?.(queue);
  }, [onPlayAll, queue]);

  const handleRename = useCallback(() => {
    onRenameQueue?.(queue);
  }, [onRenameQueue, queue]);

  const handleDelete = useCallback(() => {
    onDeleteQueue?.(queue.id);
  }, [onDeleteQueue, queue.id]);

  return (
    <article className="playlist-card" onClick={handleOpen}>
      <img src={queue.cover || FALLBACK_IMAGE} alt={queue.name} />
      <div>
        <h4>{queue.name || 'Saved Queue'}</h4>
        <p>{queue.songCount || queue.songs?.length || 0} songs</p>
      </div>
      <div className="playlist-card__actions" onClick={handleActionsWrapperClick}>
        <button type="button" onClick={handlePlayAll}>
          <PlayCircle size={15} /> Play All
        </button>
        <button
          type="button"
          onClick={handleRename}
          aria-label={`Rename ${queue.name}`}
        >
          <Edit3 size={15} />
        </button>
        <button
          type="button"
          className="danger"
          onClick={handleDelete}
          aria-label={`Delete ${queue.name}`}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}

export default memo(PlaylistCard);
