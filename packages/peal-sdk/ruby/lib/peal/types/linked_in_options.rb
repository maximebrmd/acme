# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    # How a post goes out on a LinkedIn profile or company page. Scheduling needs none of them; a link (`linkUrl`) needs
    # its `linkTitle`.
    class LinkedInOptions < Internal::Types::Model
      field :disable_reshare, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "disableReshare"

      field :document_title, -> { String }, optional: true, nullable: false, api_name: "documentTitle"

      field :link_description, -> { String }, optional: true, nullable: false, api_name: "linkDescription"

      field :link_title, -> { String }, optional: true, nullable: false, api_name: "linkTitle"

      field :link_url, -> { String }, optional: true, nullable: false, api_name: "linkUrl"

      field :mentions, -> { Internal::Types::Array[Peal::Types::LinkedInMention] }, optional: true, nullable: false

      field :visibility, -> { Peal::Types::LinkedInVisibility }, optional: true, nullable: false
    end
  end
end
