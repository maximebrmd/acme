# frozen_string_literal: true

module Peal
  module ChannelDefaults
    module Types
      class NewChannelDefaults < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

        field :options, -> { Peal::Types::TargetOptions }, optional: false, nullable: false
      end
    end
  end
end
