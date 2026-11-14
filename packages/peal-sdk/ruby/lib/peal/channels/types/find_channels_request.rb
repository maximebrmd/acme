# frozen_string_literal: true

module Peal
  module Channels
    module Types
      class FindChannelsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :cursor, -> { String }, optional: true, nullable: false

        field :limit, -> { String }, optional: true, nullable: false

        field :platform, -> { Peal::Types::ChannelPlatform }, optional: true, nullable: false

        field :q, -> { String }, optional: true, nullable: false

        field :status, -> { Peal::Types::ChannelStatusName }, optional: true, nullable: false
      end
    end
  end
end
