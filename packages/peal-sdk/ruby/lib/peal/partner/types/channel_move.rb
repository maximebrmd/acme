# frozen_string_literal: true

module Peal
  module Partner
    module Types
      class ChannelMove < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

        field :to_workspace_id, -> { String }, optional: false, nullable: false, api_name: "toWorkspaceId"
      end
    end
  end
end
