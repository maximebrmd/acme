# frozen_string_literal: true

module Peal
  module Invitations
    module Types
      class NewInvitation < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :email, -> { String }, optional: false, nullable: false

        field :role, -> { Peal::Types::Role }, optional: false, nullable: false
      end
    end
  end
end
