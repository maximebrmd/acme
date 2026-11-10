# frozen_string_literal: true

module Peal
  module ConnectLinks
    module Types
      class GetConnectLinksRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :link_id, -> { String }, optional: false, nullable: false, api_name: "linkId"
      end
    end
  end
end
