# frozen_string_literal: true

module Peal
  module Channels
    module Types
      class ReconnectChannelsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

        field :messages, -> { Peal::Channels::Types::ReconnectChannelsRequestMessages }, optional: true, nullable: false

        field :reposts, -> { Peal::Channels::Types::ReconnectChannelsRequestReposts }, optional: true, nullable: false
      end
    end
  end
end
