// 3d party imports
import { Injectable } from '@angular/core';
import { AngularFire } from 'angularfire2';
import { Observable, ReplaySubject } from 'rxjs';
import { Storage } from '@ionic/storage';

// app imports
import { Speaker, Session } from '../entities';

@Injectable()
export class ConferenceDataService {

  rpSpeakers$ = new ReplaySubject<Speaker[]>();
  rpSessions$ = new ReplaySubject<Session[]>();

  // basic entities
  private rooms$: Observable<string[]> = this.loadEntity('rooms');
  private speakers$: Observable<Speaker[]> = this.loadEntity('speakers');
  private sessions$: Observable<Session[]> = this.loadEntity('sessions');

  // for every public stream we had to create a replay subject (otherwise it would only listen to it once)
  constructor(private af: AngularFire,
              private storage: Storage) {

    Observable.combineLatest(
      this.rooms$,
      this.sessions$,
      (rooms: string[], sessions: Session[]): Session[] => {
        return sessions.map((session: any) => {
          session.startDate = new Date(session.startDate);
          session.endDate = new Date(session.endDate);
          session.room = rooms[session.roomId];

          delete session.roomId;

          return session;
        });
      }
    ).subscribe((sessions: Session[]) => {
      this.rpSessions$.next(sessions);
    });

    Observable.combineLatest(
      this.speakers$,
      this.rpSessions$,
      (speakers: Speaker[], sessions: Session[]): Speaker[] => {
        return speakers.map((speaker: any) => {
          if (speaker.sessionIds) {
            speaker.sessions = speaker.sessionIds.map((x: number) => sessions[x]);

            delete speaker.sessionIds;
          }

          return speaker;
        });
      }
    ).subscribe((speakers: Speaker[]) => {
      this.rpSpeakers$.next(speakers);
    });
  }

  private loadEntity(entity: string) {
    return Observable.merge(
      this.loadRemoteEntity(entity),
      this.loadLocalEntity(entity)
    ).filter(Boolean);
  }

  private loadRemoteEntity(entity: string) {
    return this.af.database.list(entity)
      .do(result => {
        this.storage.set(entity, JSON.stringify(result));
      });
  }

  private loadLocalEntity(entity: string) {
    return this.storage.get(entity)
      .then(result => result && JSON.parse(result));
  }

  private prefetch(url: string) {
    const img = new Image()
    img.src = url;
  }
}