import { z } from "zod";
import { protectedProcedure } from "../procedure";
import {
  personFields,
  encounterFields,
  entryFields,
  entryLinks,
  createKey,
  versionedId,
  recordId,
  pageInput,
  personListInput,
  mergePeopleInput,
  importTranscriptInput,
} from "@/lib/love-stories/model";
import { loveStoriesService as service } from "@/server/services/love-stories/service";

export const loveStoriesRouter = {
  export: protectedProcedure.handler(({ context }) =>
    service.exportData(context.session.user.id),
  ),
  person: {
    list: protectedProcedure
      .input(personListInput)
      .handler(({ context, input }) =>
        service.listPeople(context.session.user.id, input),
      ),
    get: protectedProcedure
      .input(z.strictObject({ id: recordId }))
      .handler(({ context, input }) =>
        service.getPerson(context.session.user.id, input.id),
      ),
    create: protectedProcedure
      .input(personFields.extend(createKey.shape))
      .handler(({ context, input }) =>
        service.createPerson(context.session.user.id, input),
      ),
    update: protectedProcedure
      .input(versionedId.extend({ changes: personFields.partial() }))
      .handler(({ context, input }) =>
        service.updatePerson(context.session.user.id, input),
      ),
    delete: protectedProcedure
      .input(versionedId)
      .handler(({ context, input }) =>
        service.deletePerson(context.session.user.id, input),
      ),
    merge: protectedProcedure
      .input(mergePeopleInput)
      .handler(({ context, input }) =>
        service.mergePeople(context.session.user.id, input),
      ),
  },
  encounter: {
    list: protectedProcedure
      .input(pageInput.extend({ personId: recordId }))
      .handler(({ context, input }) =>
        service.listEncounters(context.session.user.id, input),
      ),
    create: protectedProcedure
      .input(encounterFields.extend({ ...createKey.shape, personId: recordId }))
      .handler(({ context, input }) =>
        service.createEncounter(context.session.user.id, input),
      ),
    update: protectedProcedure
      .input(versionedId.extend({ changes: encounterFields }))
      .handler(({ context, input }) =>
        service.updateEncounter(context.session.user.id, input),
      ),
    reorder: protectedProcedure
      .input(
        z.strictObject({
          personId: recordId,
          items: z.array(versionedId).max(1000),
        }),
      )
      .handler(({ context, input }) =>
        service.reorderEncounters(context.session.user.id, input),
      ),
    delete: protectedProcedure
      .input(versionedId)
      .handler(({ context, input }) =>
        service.deleteEncounter(context.session.user.id, input),
      ),
  },
  entry: {
    importTranscript: protectedProcedure
      .input(importTranscriptInput)
      .handler(({ context, input }) =>
        service.importTranscript(context.session.user.id, input),
      ),
    list: protectedProcedure
      .input(
        pageInput.extend({
          personId: recordId.optional(),
          encounterId: recordId.optional(),
        }),
      )
      .handler(({ context, input }) =>
        service.listEntries(context.session.user.id, input),
      ),
    get: protectedProcedure
      .input(z.strictObject({ id: recordId }))
      .handler(({ context, input }) =>
        service.getEntry(context.session.user.id, input.id),
      ),
    create: protectedProcedure
      .input(entryFields.extend({ ...createKey.shape, ...entryLinks.shape }))
      .handler(({ context, input }) =>
        service.createEntry(context.session.user.id, input),
      ),
    update: protectedProcedure
      .input(
        versionedId.extend({
          changes: entryFields.partial().extend(entryLinks.shape),
        }),
      )
      .handler(({ context, input }) =>
        service.updateEntry(context.session.user.id, input),
      ),
    delete: protectedProcedure
      .input(versionedId)
      .handler(({ context, input }) =>
        service.deleteEntry(context.session.user.id, input),
      ),
  },
};
