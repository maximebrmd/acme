# frozen_string_literal: true

module Peal
  module Channels
    module Types
      class ConnectSite < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :address, -> { String }, optional: false, nullable: false

        field :application_password, -> { String }, optional: false, nullable: false, api_name: "applicationPassword"

        field :platform, -> { Peal::Types::SitePlatform }, optional: false, nullable: false

        field :user_name, -> { String }, optional: false, nullable: false, api_name: "userName"
      end
    end
  end
end
