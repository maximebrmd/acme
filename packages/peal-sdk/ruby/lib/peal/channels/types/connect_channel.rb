# frozen_string_literal: true

module Peal
  module Channels
    module Types
      class ConnectChannel < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

        field :connection, -> { Peal::Types::ChannelConnection }, optional: true, nullable: false

        field :handle, -> { String }, optional: true, nullable: false

        field :instance, -> { String }, optional: true, nullable: false
      end
    end
  end
end
