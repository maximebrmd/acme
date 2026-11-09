# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Invitation < Internal::Types::Model
      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :email, -> { String }, optional: false, nullable: false

      field :expires_at, -> { String }, optional: false, nullable: false, api_name: "expiresAt"

      field :id, -> { String }, optional: false, nullable: false

      field :inviter_id, -> { String }, optional: false, nullable: false, api_name: "inviterId"

      field :role, -> { String }, optional: false, nullable: false
    end
  end
end
