# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Reviewer < Internal::Types::Model
      field :kind, -> { Peal::Types::ReviewerKind }, optional: false, nullable: false

      field :link_id, -> { String }, optional: false, nullable: true, api_name: "linkId"

      field :name, -> { String }, optional: false, nullable: true

      field :user_id, -> { String }, optional: false, nullable: true, api_name: "userId"
    end
  end
end
