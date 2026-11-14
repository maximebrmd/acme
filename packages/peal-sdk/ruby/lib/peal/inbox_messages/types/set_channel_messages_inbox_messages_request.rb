# frozen_string_literal: true

module Peal
  module InboxMessages
    module Types
      class SetChannelMessagesInboxMessagesRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

        field :enabled, -> { Internal::Types::Boolean }, optional: false, nullable: false
      end
    end
  end
end
