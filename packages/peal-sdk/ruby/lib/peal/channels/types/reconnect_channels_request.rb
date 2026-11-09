# frozen_string_literal: true

module Peal
  module Channels
    module Types
      class ReconnectChannelsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"
      end
    end
  end
end
