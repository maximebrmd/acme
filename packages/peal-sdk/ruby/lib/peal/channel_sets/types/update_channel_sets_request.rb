# frozen_string_literal: true

module Peal
  module ChannelSets
    module Types
      class UpdateChannelSetsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :channel_set_id, -> { String }, optional: false, nullable: false, api_name: "channelSetId"

        field :body, -> { Peal::Types::ChannelSetDetails }, optional: false, nullable: false
      end
    end
  end
end
