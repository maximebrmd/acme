# frozen_string_literal: true

module Peal
  module ShortLinks
    module Types
      class GetShortLinksRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :link_id, -> { String }, optional: false, nullable: false, api_name: "linkId"

        field :from, -> { String }, optional: true, nullable: false

        field :to, -> { String }, optional: true, nullable: false
      end
    end
  end
end
