# frozen_string_literal: true

module Peal
  module Inbox
    module Types
      class GetAbilitiesInboxRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"
      end
    end
  end
end
